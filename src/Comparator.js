/**
 * Created by user on 11.05.2017.
 */
const Splitter = require('./Splitter');
const LCS = require('./LCS');
const LCSDistanceResolver = require('./LCSDistanceResolver');

class Comparator {
    static sameDiffLines(diff1, diff2) {
        return diff1[1].id === diff2[1].id;
    }

    static sameDataLines(line1, line2) {
        return line1.id === line2.id;
    }

    static sameWords(word1, word2) {
        let lcsDistanceResolver = new LCSDistanceResolver();
        lcsDistanceResolver.resolve(word1, word2);

        const GATE = 0.8;
        const maxLength = Math.max(word1.length, word2.length);
        const dist = lcsDistanceResolver.distance;
        const lcsLength = LCS.getLCSLength(word1, word2);
        return dist / maxLength < GATE || dist < lcsLength;
    }

    static sameSentences(sent1, sent2) {
        let splitSentence1 = sent1.match(/(\S+|\s+)/g);
        let splitSentence2 = sent2.match(/(\S+|\s+)/g);

        let lcsDistanceResolver = new LCSDistanceResolver();
        lcsDistanceResolver.resolve(splitSentence1, splitSentence2, Comparator.sameWords);

        const GATE = 0.8;
        const maxLength = Math.max(splitSentence1.length, splitSentence2.length);
        const dist = lcsDistanceResolver.distance;
        const lcsLength = LCS.getLCSLength(sent1, sent2);
        return dist / maxLength < GATE || lcsLength > Math.max(sent1.length, sent2.length) / 2
    }

    static sameEncodedSentences(seq1, seq2) {
        const GATE = 0.75;
        const split1 = Splitter.splitEncodedToWords(seq1);
        const split2 = Splitter.splitEncodedToWords(seq2);

        let lcsDistanceResolver = new LCSDistanceResolver();
        lcsDistanceResolver.resolve(split1, split2, Comparator.sameEncodedWords);

        const dist = lcsDistanceResolver.distance;
        if ((dist / Math.max(split1.length, split2.length)) < GATE) {
            return true;
        } else {
            let deep1 = Splitter.splitEncodedToChars(seq1);
            let deep2 = Splitter.splitEncodedToChars(seq2);
            let lcsLength = LCS.getLCSLength(deep1, deep2, Comparator.sameEncodedChars);
            return lcsLength > Math.max(deep1.length, deep2.length) / 2;
        }
    }

    static sameEncodedWords(seq1, seq2) {
        const split1 = Splitter.splitEncodedToChars(seq1);
        const split2 = Splitter.splitEncodedToChars(seq2);
        const lcsLength = LCS.getLCSLength(split1, split2, Comparator.sameEncodedChars);
        return lcsLength > Math.max(split1.length, split2.length) / 2;
    }

    static sameEncodedChars(ch1, ch2) {
        return ch1.slice(0, 2) === ch2.slice(0, 2);
    }

    static modifiedDiffLine(diff1, diff2) {
        return ((diff1[0] === 0 || diff1[0] === 3) && diff2[0] === 3) ||
            diff2[0] === 2 && diff1 !== 2
    }

    static modifiedDataLine(dl1, dl2) {
        return dl1.content !== dl2.content;
    }

    static modifiedItem(item1, item2) {
        return item1 !== item2;
    }
}
module.exports = Comparator;