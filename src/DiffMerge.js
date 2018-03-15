/**
 * Created by user on 11.05.2017.
 */
const Comparator = require('./Comparator');
const Splitter = require('./Splitter');
const LCS = require('./LCS');
const HTMLConverter = require('./HTMLConverter');
const LCSDistanceResolver = require('./LCSDistanceResolver');
const enums = require('./Enums');
const ChangeType = enums.ChangeType;

class DiffMerge {
    static getConfig() {
        return [
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
        ]
    }

    static getDiff(base, alt, isEqualFn, isModifiedFn) {
        let lcsDistanceResolver = new LCSDistanceResolver();
        lcsDistanceResolver.resolve(base, alt, isEqualFn);
        let prev = lcsDistanceResolver.previousMatrix;
        return LCS.buildLCS(base, alt, prev, isModifiedFn);
    }

    static get3WayDiff(base, act, mreq) {
        const sequences = [].slice.call(arguments).map((str) => {
            return HTMLConverter.htmlToSequence(str).map((line) => {
                if (line.content) {
                    line.target = HTMLConverter.encodeHTMLString(line.content);
                }
                return line;
            })
        });

        const diffBaseToAct = DiffMerge.getDiff(sequences[0], sequences[1], Comparator.sameDataLines, Comparator.modifiedDataLine);
        const diffBaseToMreq = DiffMerge.getDiff(sequences[0], sequences[2], Comparator.sameDataLines, Comparator.modifiedDataLine);
        return DiffMerge.mergeDiffs(diffBaseToAct, diffBaseToMreq);
    }

    static mergeDataLines(str1, str2, level = 0) {
        const cfg = DiffMerge.getConfig();
        let base = cfg[level].splitFn(str1);
        let alt = cfg[level].splitFn(str2);
        // skipping level if splitted strings contain only 1 element
        if (base.length === 1 && alt.length === 1 && level < cfg.length - 1) {
            level++;
            base = cfg[level].splitFn(base[0]);
            alt = cfg[level].splitFn(alt[0]);
        }
        let sdiff = DiffMerge.getDiff(base, alt, cfg[level].isEqualFn, cfg[level].isModifiedFn);
        if (level < cfg.length - 1) {
            let flatDiff = [];
            sdiff.forEach((item) => {
                if (item[0] === 3) {
                    flatDiff.push(...DiffMerge.mergeDataLines(item[1], item[2], level + 1));
                } else {
                    flatDiff.push(item);
                }
            });
            return DiffMerge.groupChanges(flatDiff);
        } else {
            return DiffMerge.groupChanges(sdiff);
        }
    }

    static groupChanges(diff) {
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
        }, []);
        groupedDiff = groupedDiff.reverse();
        groupedDiff = groupedDiff.map((edit) => {
            if (edit[0] === ChangeType.MODIFIED) {
                return [ChangeType.MODIFIED, edit[1].join(''), edit[2].join('')];
            }
            return [edit[0], edit.slice(1).join('')];
        });

        for (let i = 0, _l = groupedDiff.length; i < _l; i++) {
            let change = groupedDiff[i];
            if (change[0] == ChangeType.ADDED && groupedDiff.length > i + 1 && groupedDiff[i + 1][0] == ChangeType.DELETED) {
                let addedChanged = change;
                let deletedChange = groupedDiff[i + 1];
                groupedDiff[i + 1] = addedChanged;
                groupedDiff[i] = deletedChange;
            }
        }
        return groupedDiff;
    }

    static mergeDiffs(actDiff, mreqDiff) {
        let merged = DiffMerge.getDiff(actDiff, mreqDiff, Comparator.sameDiffLines, Comparator.modifiedDiffLine);
        diffToConsole(actDiff);
        diffToConsole(mreqDiff);

        return merged.map((line) => {
            let resLine;
            let actLine = actDiff.filter((item) => item[1].id === line[1][1].id)[0];
            if (actLine) {
                // line added by main actor is displayed as idle
                if (actLine[0] === ChangeType.ADDED) {
                    line[0] = 0;
                }
                // line deleted by main actor is excluded from diff
                if (actLine[0] === ChangeType.DELETED) {
                    line[0] = -1;
                }
            }
            // lines have conflict to resolve
            if (line[0] === ChangeType.MODIFIED) {
                // line deleted by mreq actor is displayed as deleted (if it is kept by main actor)
                if (line[2][0] === ChangeType.DELETED) {
                    resLine = [ChangeType.DELETED, line[1].slice(-1)[0]]
                } else {
                    // merging conflicting changes
                    resLine = [ChangeType.MODIFIED, line[1].slice(-1)[0], DiffMerge.mergeDataLines(line[1].slice(-1)[0].target, line[2].slice(-1)[0].target)];
                }
            } else {
                resLine = [line[0], line[1].slice(-1)[0]];
            }
            return resLine;
        }).filter((line) => line[0] > -1);

        function diffToConsole(diff) {
            let consout = diff.map((line) => `${line[0]} : ${line[1].id}`).join('\n');
        }
    }
}
module.exports = DiffMerge;