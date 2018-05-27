'use strict';
import { ExtensionContext, languages, DocumentLinkProvider, TextDocument, CancellationToken, DocumentLink, Range, Uri, workspace, window, DecorationOptions, TextEditorDecorationType } from 'vscode';
import * as path from 'path';
import * as keytar from 'keytar'; // Only types
import fetch from 'node-fetch';
import * as tar from 'tar';
import * as fs from 'fs-extra';
type Keytar = typeof keytar;
type CodeToUrl = { code: string; url: string; };

// TODO: Have a decorator for each ticket type
let jiraDecorator: TextEditorDecorationType;

export async function activate(context: ExtensionContext) {
    migrate();

    const jiraTicketLinkProvider = new JiraTicketLinkProvider();
    context.subscriptions.push(languages.registerDocumentLinkProvider({ scheme: 'file', language: 'markdown' }, jiraTicketLinkProvider));
    context.subscriptions.push(languages.registerDocumentLinkProvider({ scheme: 'untitled', language: 'markdown' }, jiraTicketLinkProvider));

    jiraDecorator = window.createTextEditorDecorationType({
        before: {
            // Construct full path as required by the API (from the out directory)
            contentIconPath: path.join(__dirname, 'ico/jira.png'),
            height: '16px',
            width: '16px',
        }
    });
    context.subscriptions.push(jiraDecorator);

    try {
        const version = '4.2.1';
        const name = `keytar-v${version}-electron-v${process.versions.modules}-${process.platform}-${process.arch}`;
        const tarGzFilePath = path.join(__dirname, name + '.tar.gz');
        const tarFilePath = path.join(__dirname, name + '.tar.gz');
        const nodeFilePath = path.join(__dirname, 'build/Release/keytar.node');
        console.log(`Obtaining ${name}:`);
        const response = await fetch('https://api.github.com/repos/atom/node-keytar/releases');
        console.log('Downloaded Keytar GitHub releases.');
        const data = await response.json();
        console.log('Decoded releases.');
        const release = data.find((release: any) => release.tag_name === 'v' + version);
        console.log(`Found the ${version} release.`);
        const asset = release.assets.find((asset: any) => asset.name === name + '.tar.gz');
        console.log(`Found the ${name} asset.`);
        const response2 = await fetch(asset.browser_download_url);
        console.log('Downloaded the asset');
        await fs.writeFile(tarGzFilePath, await response2.buffer());
        console.log('Saved the asset');
        await tar.x({ f: tarGzFilePath, cwd: __dirname }, [name + '.tar']);
        console.log('Extracted the asset .tar.gz.');
        await tar.x({ f: tarFilePath, cwd: __dirname }, ['build/Release/keytar.node']);
        console.log('Extracted the asset .tar.');
        const keytar = require(nodeFilePath) as Keytar;
        console.log('Loaded the module');
        await keytar.setPassword('test', 'test', 'test');
        console.log('Set');
        console.log(await keytar.findPassword('test'));

        const { codesToUrls } = workspace.getConfiguration('markDownJiraLinks');
        for (const { url } of codesToUrls) {
            await keytar.setPassword(url, 'tom', 'heslo');
            window.showInformationMessage(await keytar.findPassword(url) || 'Error');
        }
    } catch (error) {
        console.log(error);
        window.showErrorMessage('Not available for you.');
    }
}

function migrate() {
    // Initially, codesToUrls expected the URLs ending in browse/, but since we are involving API, we just want the root now.
    const { codesToUrls } = workspace.getConfiguration('markDownJiraLinks');
    const items = [];
    for (const { code, url } of codesToUrls) {
        if (url.endsWith('browse/')) {

            items.push({ code, url: url.substring(0, url.length - 'browse/'.length) });
        } else {
            items.push({ code, url });
        }
    }

    workspace.getConfiguration('markDownJiraLinks').update('codesToUrls', items);
}

async function decorate(document: TextDocument, links: DocumentLink[]) {
    const editor = await window.showTextDocument(document);
    const decorations = links.map((link): DecorationOptions => {
        return {
            range: link.range,
            hoverMessage: link.target!.toString(),
        };
    });

    editor.setDecorations(jiraDecorator, decorations);
}

class JiraTicketLinkProvider implements DocumentLinkProvider {
    provideDocumentLinks(document: TextDocument, token: CancellationToken) {
        const { codesToUrls } = workspace.getConfiguration('markDownJiraLinks');
        const text = document.getText();
        const links: DocumentLink[] = [];
        for (const { code, url } of codesToUrls as CodeToUrl[]) {
            const regex = new RegExp(code + '-\\d+', 'g');
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
                const range = new Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
                let target = Uri.parse(url + 'browse/' + match[0]);
                links.push(new DocumentLink(range, target));
            }
        }

        // Fire and forget
        decorate(document, links);
        return links;
    }
}
