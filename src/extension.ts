'use strict';
import { ExtensionContext, languages, DocumentLinkProvider, TextDocument, CancellationToken, DocumentLink, Range, Uri, workspace, window, DecorationOptions, TextEditorDecorationType } from 'vscode';
import * as path from 'path';

// TODO: Have a decorator for each ticket type
let jiraDecorator: TextEditorDecorationType;

export function activate(context: ExtensionContext) {
    const jiraTicketLinkProvider = new JiraTicketLinkProvider();
    context.subscriptions.push(languages.registerDocumentLinkProvider("markdown", jiraTicketLinkProvider));

    jiraDecorator = window.createTextEditorDecorationType({
        before: {
            // Construct full path as required by the API (from the out directory)
            contentIconPath: path.join(__dirname, 'ico/jira.png'),
            height: '16px',
            width: '16px',
        }
    });
    context.subscriptions.push(jiraDecorator);
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
        for (const { code, url } of codesToUrls) {
            const regex = new RegExp(code + '-\\d+', 'g');
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
                const range = new Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
                let target = Uri.parse(url + match[0]);
                links.push(new DocumentLink(range, target));
            }
        }

        // Fire and forget
        decorate(document, links);
        return links;
    }
}
