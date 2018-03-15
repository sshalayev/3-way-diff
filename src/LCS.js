/**
 * Created by user on 11.05.2017.
 */
const enums = require('./Enums');
const ChangeType = enums.ChangeType;

class LCS {
    static getLCSLength(seq1, seq2, isEqualFn = (a, b) => a === b) {
        if (seq1.length < seq2.length) {
            [seq1, seq2] = [seq2, seq1]
        }
        let lcs = [[], []];
        for (let i = 0; i <= seq2.length; ++i) {
            lcs[0][i] = 0;
            lcs[1][i] = 0;
        }
        for (let i = 1; i <= seq1.length; ++i) {
            lcs[1][0] = 0;
            for (let j = 1; j <= seq2.length; ++j) {
                lcs[0][j] = lcs[1][j];
                let tmp = lcs[j];
                if (isEqualFn(seq1[i - 1], seq2[j - 1])) {
                    lcs[1][j] = lcs[0][j - 1] + 1
                } else {
                    if (lcs[0][j] >= lcs[1][j - 1]) {
                        lcs[1][j] = lcs[0][j]
                    } else {
                        lcs[1][j] = lcs[1][j - 1]
                    }
                }
            }
        }
        return lcs[1][seq2.length];
    }

    static buildLCS(seq1, seq2, prev, isModifiedFn) {
        return traverse(seq1.length, seq2.length);

        function traverse(rn, cn, lcs = []) {
            if (rn === 0 && cn === 0) {
                return lcs;
            }
            if (rn === 0 && cn > 0) {
                lcs.unshift(...seq2.slice(0, cn).map((item) => [ChangeType.ADDED, item]));
                return lcs;
            }
            if (rn > 0 && cn === 0) {
                lcs.unshift(...seq1.slice(0, rn).map((item) => [ChangeType.DELETED, item]));
                return lcs;
            }
            let [prn, pcn] = prev[rn][cn];
            if (prn === rn - 1 && pcn === cn - 1) {
                if (isModifiedFn && isModifiedFn(seq1[prn], seq2[pcn])) {
                    lcs.unshift([ChangeType.MODIFIED, seq1[prn], seq2[pcn]])
                } else {
                    lcs.unshift([ChangeType.NOT_CHANGED, seq1[prn]]);
                }
            }
            else if (prn === rn - 1 && pcn === cn) {
                lcs.unshift([ChangeType.DELETED, seq1[prn]]);
            }
            else if (prn === rn && pcn === cn - 1) {
                lcs.unshift([ChangeType.ADDED, seq2[pcn]]);
            }
            return traverse(prn, pcn, lcs);
        }
    }
}

module.exports = LCS;