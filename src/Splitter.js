/**
 * Created by user on 11.05.2017.
 */
class Splitter {
    static splitEncodedToChars (str) {
        return str.replace(/(Z)/g, '$1::').split('::').filter((v) => v.length > 0);
    }
    static splitEncodedToWords (str) {
        return str.replace(/(Z20\w{10})/g, '$1::').split('::').filter((v) => v.length > 0);
    }
    static splitEncodedToSentences (str) {
        return str.replace(/(Z(2E|3F|3A|3B|21)\w{10})/g, '$1::').split('::').filter((v) => v.length > 0);
    }
    static splitTextToSentences (item) {
        return item.replace(/([.!?;]+)/g, '$1 ::').split('::').map((sent) => {
            return sent.trim();
        }).filter((sent) => sent.length > 0);
    }
}
module.exports = Splitter;