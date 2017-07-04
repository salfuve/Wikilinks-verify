import * as fs from 'fs';
import * as request from 'superagent';
import * as glob from 'glob';

let directory = process.argv[2]; // wiki directory
let remark = require('remark');
let links: string[] = [];
let external_links: string[] = []

/**Read each asciidoc of the directory where the wiki has been cloned and call the function getlinks to iterate for each asciidoc */
glob(directory + '*asciidoc', async function (err: any, files: any) {
    files.forEach(
        function (file: any) {
            let ast = remark().parse(fs.readFileSync(file, 'utf-8'));
            let childrens: any[] = ast.children;
            childrens.forEach(child => {
                getLinks(child).forEach(link => {
                    if (link.indexOf('http:') >= 0 || link.indexOf('https:') >= 0) {
                        if (!(external_links.indexOf(link) > 0)) {
                            external_links.push(link);
                        }
                    }
                    else {
                        if (!(links.indexOf(link) > 0)) {
                            links.push(link)
                        }

                    }
                })
            })
        });

    let code1 = await checkLinks(external_links);
    let code2 = await checkInternalLinks(links);
    exitCode(code1, code2)
}
)



function exitCode(code1: boolean, code2: boolean) {

    if (code1 && code2) { process.exitCode = 0 }
    else { console.log(process.exitCode = 1) }

}

async function sendRequest(link: string): Promise<boolean> {
    let req = link
    let response: any
    let code: boolean = true;
    return new Promise<boolean>((resolve, reject) =>
        request.
            head(req).
            end(function (err: any, res: request.Response) {
                if (res == undefined) {
                    console.log(link + " " + res)
                }
                else {
                    response = res.status
                    if (response == 404 && link.indexOf('https://github.com') >= 0) {
                        console.log(link + ' cannot be verified')
                    }
                    else {
                        if (response == 404) {
                            console.log(link + " -->" + response)
                            resolve(false);
                            return;
                        }
                    }
                }

                resolve(true);
            }
            ))
}

function getLinks(childOfChild: any): string[] {
    let links: string[] = [];
    if (childOfChild.children) {
        let childrenNew: any[] = childOfChild.children;
        childrenNew.forEach(subChild => {
            if (subChild.type) {
                switch (subChild.type) {
                    case 'link':
                        links.push(fixLink(subChild.url));
                        break;
                    case 'text':
                        let str = subChild.value
                        if (str.indexOf('link:') >= 0) {
                            links.push(getLinkValue(str))
                        }
                        else if (str.indexOf('image::') >= 0) {
                            links.push(getImageValue(str))
                        }
                    default:
                        return getLinks(subChild);
                }
            }
        })
    }
    return links;
}

function fixLink(link: string) {
    if (link.indexOf('[') >= 0) {
        return link.substring(0, link.indexOf('['));
    } else {
        return link;
    }
}
function getLinkValue(link: string) {

    return link.substring(link.indexOf(':') + 1)
}
function getImageValue(link: string) {
    return link.substring(link.indexOf('images'))
}
/**Verify the links */
async function checkLinks(eLinks: string[]) {
    let code = true;
    for (let i = 0; i < eLinks.length; i++) {
        code = await sendRequest(eLinks[i])
    }
    return code;
}
async function checkInternalLinks(Ilinks: string[]) {
    let adoc = '.asciidoc';
    let code = true;
    for (let i = 0; i < Ilinks.length; i++) {

        if (Ilinks[i].indexOf('#') > 0) {
            let str = (Ilinks[i].substring(0, Ilinks[i].indexOf('#')))
            if (!(fs.existsSync(directory + str + adoc))) {
                console.log(directory + str + adoc + ' False')
                code = false
            }
        }
        else {

            if (!(fs.existsSync(directory + Ilinks[i])) && !(fs.existsSync(directory + Ilinks[i] + '.asciidoc'))) {
                code = false;
                console.log(directory + Ilinks[i] + ' False')
            }
        }
    }
    return code;
}
