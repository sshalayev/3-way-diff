/**
 * Created by user on 11.05.2017.
 */
const Promise = require('bluebird');
const cheerio = require('cheerio');
const htmlparser = require("htmlparser2");
const enums = require('./Enums');
const ChangeType = enums.ChangeType;

class FormatModifier {
    constructor() {
        this.bius = 0;
        this.size = 12;
        this.color = '000000';
    }

    update(tag, value) {
        if (!value) {
            this.bius = this.bius ^ FormatModifier.convertBIUS(tag);
        }
    }

    getString() {
        const SAMPLE_STRING = '000000000Z';
        return SAMPLE_STRING
        .splice(0, 1, this.getHexValue('bius', 1))
        .splice(1, 2, this.getHexValue('size', 2))
        .splice(3, 6, this.color)
    }

    getHexValue(key, len) {
        let hex = this[key].toString(16).toUpperCase();
        return len > hex.length ? ('0').repeat(len - hex.length).concat(hex) : hex;
    }

    static parseString(str) {
        const format = {
            bius: 0,
            size: 12,
            color: '000000'
        };
        if (str) {
            format.bius = parseInt(str.slice(0, 1), 16);
            format.size = parseInt(str.slice(1, 3), 16);
            format.color = str.slice(3, 9);
        }
        return format;
    }

    static convertBIUS(x) {
        const biusTags = ['strong', 'em', 'u', 's', 'b', 'a', 'span', 'dd', 'dl', 'i', 'font'];
        if (typeof(x) === 'string') {
            return Math.pow(2, biusTags.indexOf(x))
        } else {
            let tagbin = x.toString(2).split('').reverse().map((v) => parseInt(v));
            return biusTags.filter((tag, i) => tagbin[i]);
        }
    }
}
class HTMLConverter {
    static encodeHTMLString(str, mod = new FormatModifier(), result = [], isParserStopped) {
        if(!isParserStopped) {
            let parser = new htmlparser.Parser({
                onopentag: function (name, attribs) {
                    console.log(`Open tag ${name}`)
                },
                ontext: function (text) {
                    console.log("-->", text);
                },
                onclosetag: function (tagname) {
                    console.log(`Closed tag ${tagname}`)
                }
            }, {decodeEntities: true});
            parser.write(str);
            parser.end();
        }


        let nextTag = str.match(/\<(\/)?([a-z\-]+).*?\>/i);
        let cleanSubstr = str.slice(0, nextTag ? nextTag.index : undefined).split('').map((ch) => {
            let code = ch.charCodeAt();
            return code.toString(16).toUpperCase() + mod.getString();
        });
        result.push(...cleanSubstr);
        if (nextTag) {
            mod.update(nextTag[2]);
            return HTMLConverter.encodeHTMLString(str.slice(nextTag.index + nextTag[0].length), mod, result, true);
        } else {
            return result.join('');
        }
    }

    static decodeHTMLString(str, prevFormat, result = []) {
        let pcf, ppf, ptags, dtags;
        if (!str.length) {
            let trailing;
            if (result[result.length - 1] === ' ') {
                trailing = result.pop();
            }
            ppf = FormatModifier.parseString(prevFormat);
            ptags = FormatModifier.convertBIUS(ppf.bius);
            ptags.forEach((pt) => {
                result.push(`</${pt}>`)
            });
            if (trailing) {
                result.push(' ');
            }
            return result.join('');
        }
        let fragment = str.slice(0, 12);
        let char = String.fromCharCode(parseInt(fragment.slice(0, 2), 16));
        let currFormat = fragment.slice(2);

        if (prevFormat !== currFormat) {
            pcf = FormatModifier.parseString(currFormat);
            ppf = FormatModifier.parseString(prevFormat);
            if (ppf.bius !== pcf.bius) {
                ptags = FormatModifier.convertBIUS(ppf.bius);
                dtags = FormatModifier.convertBIUS(pcf.bius ^ ppf.bius);
                dtags.forEach((dt) => {
                    result.push(ptags.indexOf(dt) > -1 ? `</${dt}>` : `<${dt}>`)
                })
            }
        }
        result.push(char);
        return HTMLConverter.decodeHTMLString(str.slice(12), currFormat, result);
    }

    static decodeTextString(str, result = []) {
        if (!str.length) {
            return result.map((hex) => String.fromCharCode(parseInt(hex), 16)).join('')
        }
        result.push(str.slice(0, 2));
        return HTMLConverter.decodeTextString(str.slice(12), result);
    }

    static htmlToSequence(htmlString) {
        const jql = cheerio.load(htmlString);
        let dataLines = jql('[data-line-id]').toArray();
        const contentLineTags = ['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'div', 'ol', 'ul'];

        return dataLines.map((elem) => {
            let isContent = contentLineTags.indexOf(elem.tagName.toLowerCase()) > -1;
            let parentLineId = jql(elem).parent().attr('data-line-id');
            return {
                id: jql(elem).attr('data-line-id'),
                tag: elem.tagName.toLowerCase(),
                content: isContent ? jql(elem).html().replace(/\<(\w+)\sdata-line-id.+\/\1>/, '') : undefined,
                parentLineId: parentLineId,
                attribs: elem.attribs
            }
        });
    }

    static sequenceToHtml(diff, dom = cheerio.load('<div id="diff_root"></div>'), idx = 0) {
        if (!diff[idx]) {
            return Promise.resolve(dom('div').html());
        }
        let parentSelector = !!diff[idx][1].parentLineId ?
            `[data-line-id="${diff[idx][1].parentLineId}"]` : 'div';

        return HTMLConverter.restoreDataLine(diff[idx]).then((lineElem) => {
            dom(parentSelector).append(lineElem);
            return HTMLConverter.sequenceToHtml(diff, dom, idx + 1);
        })
    }

    static restoreDataLine(line) {
        return new Promise((resolve) => {
            const dom = cheerio.load('<div id="line-warapper"></div>');
            const lineElement = dom(`<${line[1].tag}>`);
            let text;
            let changesNumber = 0;
            const styles = ['diff-idle', 'diff-ins', 'diff-del', 'diff-mod'];
            if (line[1].attribs) {
                Object.keys(line[1].attribs).forEach((key) => {
                    lineElement.attr(key, line[1].attribs[key]);
                })
            }
            if (line[0] === 3) {
                text = line[2].map((item) => {
                    let piece = HTMLConverter.decodeHTMLString(item[1]);
                    let altpiece = item[2] ? HTMLConverter.decodeHTMLString(item[2]) : undefined;

                    let trail = /\s$/.test(piece) ? ' ' : '';
                    piece = HTMLConverter.fixContentSpaces(piece);
                    if (item[0] === ChangeType.NOT_CHANGED) {
                        return piece;
                    }
                    else if (item[0] === ChangeType.MODIFIED) {
                        changesNumber++;
                        return `<span class="${styles[item[0]]} "><span class="diff-del">${altpiece}</span><span class="diff-ins">${piece}</span></span>`
                    } else {
                        changesNumber++;
                        return `<span class="${styles[item[0]]}">${piece}</span>`
                    }
                }).join('');
            } else {
                text = line[1].content;
                if (line[0] > 0) {
                    lineElement.addClass(styles[line[0]]);
                }
            }
            if (line[1].content) {
                lineElement.html(text);
            }

            resolve(lineElement);
        })
    }

    static fixContentSpaces(content) {
        const spaceSymbol = '&#8203;';
        const listTagNames = ["ol", "ul"];
        const liTagName = 'li';
        let div = document.createElement('div');
        div.innerHTML = content.replace(/\n/gi, '');
        let treeWalker = document.createTreeWalker(
            div,
            NodeFilter.SHOW_ALL,
            {
                acceptNode: (node) => {
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        while (treeWalker.nextNode()) {
            let node = treeWalker.currentNode;
            if (node.nodeType == 3) {

                if (node.parentNode.nodeName.toLowerCase() === liTagName &&
                    node.previousSibling &&
                    node.previousSibling.nodeType == 1 &&
                    listTagNames.indexOf(node.previousSibling.nodeName.toLowerCase()) > -1) {
                    node.nodeValue = '';
                } else {
                    node.nodeValue = node.nodeValue.replace(/\s/g, `${spaceSymbol} ${spaceSymbol}`);
                }
            } else if (node.nodeType == 3 && listTagNames.indexOf(node.parentNode.nodeName.toLowerCase()) > -1) {
                node.nodeValue = '';
            }
        }
        return div.innerHTML.replace(/&amp;/gi, '&');
    }
}
module.exports = HTMLConverter;