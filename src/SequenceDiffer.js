const Comparator = require('./Comparator');
const Splitter = require('./Splitter');
const LCS = require('./LCS');
const LCSDistanceResolver = require('./LCSDistanceResolver');
const enums = require('./Enums');
const ChangeType = enums.ChangeType;

const sequenceSteps = [
    {
        isEqualFn: Comparator.sameEncodedSentences,
        isModifiedFn: Comparator.modifiedItem,
        splitFn: Splitter.splitEncodedToSentences
    },
    {
        isEqualFn: Comparator.sameEncodedWords,
        isModifiedFn: Comparator.modifiedItem,
        splitFn: Splitter.splitEncodedToWords
    },
    {
        isEqualFn: Comparator.sameEncodedChars,
        isModifiedFn: Comparator.modifiedItem,
        splitFn: Splitter.splitEncodedToChars
    }
];
const diffComparators = {
    isEqualFn: Comparator.sameDiffLines,
    isModifiedFn: Comparator.modifiedDiffLine,
    splitFn: (seq) => {return seq}
};

class SequenceDiffer {
    constructor (data) {
        this.prevSequence = data.prevSequence || [];
        this.oldSequence = data.oldSequence || [];
        this.newSequence = data.newSequence || [];
        this.steps = data.steps || sequenceSteps;
        this.diffComparators = data.diffComparators || diffComparators
    }

    getDiff(base, alt, comparators = this.steps[0]) {
        const lcsDistanceResolver = new LCSDistanceResolver();
        const {isEqualFn, isModifiedFn, splitFn} = comparators;
        lcsDistanceResolver.resolve(base, alt, isEqualFn);
        let prev = lcsDistanceResolver.previousMatrix;
        return LCS.buildLCS(base, alt, prev, isModifiedFn);
    }

    get3WayDiff() {
        const diffPrevToOld = this.getDiff(this.prevSequence, this.oldSequence, this.diffComparators);
        const diffPrevToNew = this.getDiff(this.prevSequence, this.newSequence, this.diffComparators);
        return this.mergeDiffs(diffPrevToOld, diffPrevToNew);
    }

    mergeSequences(str1, str2, level = 0) {
        const {isEqualFn, isModifiedFn, splitFn} = this.steps[level];
        let base = splitFn(str1);
        let alt = splitFn(str2);
        // skipping level if splitted strings contain only 1 element
        if (base.length === 1 && alt.length === 1 && level < this.steps.length - 1) {
            level++;
            base = splitFn(base[0]);
            alt = splitFn(alt[0]);
        }
        let sdiff = this.getDiff(base, alt, isEqualFn, isModifiedFn);
        if (level < this.steps.length - 1) {
            let flatDiff = [];
            sdiff.forEach((item) => {
                if (item[0] === 3) {
                    flatDiff.push(...this.mergeSequences(item[1], item[2], level + 1));
                } else {
                    flatDiff.push(item);
                }
            });
            return this.groupChanges(flatDiff);
        } else {
            return this.groupChanges(sdiff);
        }
    }

    groupChanges(diff) {
        let groupedDiff = diff.reduce((grouped, item, index) => {
            if (!grouped.length || grouped[0][0] !== item[0]) {
                grouped.unshift(item[0] === ChangeType.MODIFIED ? [3, [item[1]], [item[2]]] : item)
            } else {
                if (item[0] === ChangeType.MODIFIED) {
                    grouped[0][1].push(...item[1]);
                    grouped[0][2].push(...item[2])
                } else {
                    grouped[0].push(...item.slice(1));
                }
            }
            return grouped;
        }, []).reverse().map((edit) => {
            if (edit[0] === ChangeType.MODIFIED) {
                return [ChangeType.MODIFIED, edit[1].join(''), edit[2].join('')];
            }
            return [edit[0], edit.slice(1).join('')];
        });

        for (let i = 0, _l = groupedDiff.length; i < _l; i++) {
            let change = groupedDiff[i];
            if (change[0] === ChangeType.ADDED && groupedDiff.length > i + 1 && groupedDiff[i + 1][0] === ChangeType.DELETED) {
                let addedChanged = change;
                let deletedChange = groupedDiff[i + 1];
                groupedDiff[i + 1] = addedChanged;
                groupedDiff[i] = deletedChange;
            }
        }
        return groupedDiff;
    }

    mergeDiffs(oldDiff, newDiff) {
        let merged = this.getDiff(oldDiff, newDiff, this.diffComparators);
        diffToConsole(oldDiff);
        diffToConsole(newDiff);

        return merged.map((entry) => {
            let resEntry;
            let oldEntry = oldDiff.find((item) => item[1].id === entry[1][1].id);
            if (oldEntry) {
                // entry added by main actor is displayed as idle
                if (oldEntry[0] === ChangeType.ADDED) {
                    entry[0] = 0;
                }
                // entry deleted by main actor is excluded from diff
                if (oldEntry[0] === ChangeType.DELETED) {
                    entry[0] = -1;
                }
            }
            // entries have conflict to resolve
            if (entry[0] === ChangeType.MODIFIED) {
                // entry deleted by mreq actor is displayed as deleted (if it is kept by main actor)
                if (entry[2][0] === ChangeType.DELETED) {
                    resEntry = [ChangeType.DELETED, entry[1].slice(-1)[0]]
                } else {
                    // merging conflicting changes
                    resEntry = [ChangeType.MODIFIED, entry[1].slice(-1)[0], this.mergeSequences(entry[1].slice(-1)[0].target, entry[2].slice(-1)[0].target)];
                }
            } else {
                resEntry = [entry[0], entry[1].slice(-1)[0]];
            }
            return resEntry;
        }).filter((entry) => entry[0] > -1);

        function diffToConsole(diff) {
            let consout = diff.map((entry) => `${entry[0]} : ${entry[1].id}`).join('\n');
            console.log(consout);
        }
    }
}
module.exports = SequenceDiffer;