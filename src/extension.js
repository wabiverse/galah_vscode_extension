/* ----------------------------------------------------------------
 * :: :  M  E  T  A  V  E  R  S  E  :                            ::
 * ----------------------------------------------------------------
 * This software is Licensed under the terms of the Apache License,
 * version 2.0 (the "Apache License") with the following additional
 * modification; you may not use this file except within compliance
 * of the Apache License and the following modification made to it.
 * Section 6. Trademarks. is deleted and replaced with:
 *
 * Trademarks. This License does not grant permission to use any of
 * its trade names, trademarks, service marks, or the product names
 * of this Licensor or its affiliates, except as required to comply
 * with Section 4(c.) of this License, and to reproduce the content
 * of the NOTICE file.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND without even an
 * implied warranty of MERCHANTABILITY, or FITNESS FOR A PARTICULAR
 * PURPOSE. See the Apache License for more details.
 *
 * You should have received a copy for this software license of the
 * Apache License along with this program; or, if not, please write
 * to the Free Software Foundation Inc., with the following address
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 *
 *         Copyright (C) 2024 Wabi Foundation. All Rights Reserved.
 * ----------------------------------------------------------------
 *  . x x x . o o o . x x x . : : : .    o  x  o    . : : : .
 * ---------------------------------------------------------------- */

'use strict';
const vscode = require("vscode");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const open = util.promisify(fs.open);
const read = util.promisify(fs.read);
const close = util.promisify(fs.close);

function findDefinition(document, definition, token) {
  let path = definition.split('/').filter(Boolean);
  if (path.length == 0) return null;
  let current = 0;
  for (let line = 0; line < document.lineCount; line++) {
    if (token.isCancellationRequested) {
      return null;
    }
    let matches = document.lineAt(line).text.match('(?<=(enum|struct|class) [^"]*\")[^"]+');
    if (matches) {
      for (let m = 0; m < matches.length; m++) {
        if (token.isCancellationRequested) {
          return null;
        }
        const required = path[current];
        const actual = matches[0];
        if (required == actual) {
          current++;
          if (current == path.length) {
            return new vscode.Range(line, matches.index, line, matches.index + actual.length);
          }
        }
      }
    }
  }
}

function getPaths(document, lineNum) {
  const results = [];
  const line = document.lineAt(lineNum);
  var start = 0;
  var end = 0;
  for (var i = line.firstNonWhitespaceCharacterIndex; i < line.text.length; i++) {
    if (line.text[i] == '<') {
      start = i;
    }
    else if (line.text[i] == '>') {
      end = i;
      const text = line.text.substring(start + 1, end);
      const range = new vscode.Range(new vscode.Position(lineNum, start + 1), new vscode.Position(lineNum, end));
      results.push({ text: text, range: range });
    }
  }
  return results;
}

class HoverProvider {
  async provideHover(document, position, token) {
    const paths = getPaths(document, position.line);
    for(var i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (path.range.start.isBeforeOrEqual(position) && path.range.end.isAfterOrEqual(position)) {
        return new vscode.Hover([path.text], path.range);
      }
    }
    return null;
  }
}

class DefinitionProvider {
  provideDefinition(document, position, token) {
    const paths = getPaths(document, position.line);
    for(var i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (path.range.start.isBeforeOrEqual(position) && path.range.end.isAfterOrEqual(position)) {
        const definition = findDefinition(document, path.text, token);
        if (definition != null) {
          return new vscode.Location(document.uri, definition);
        }
      }
    }
    return null;
  }
}

async function activate(context) {
  context.subscriptions.push(vscode.languages.registerHoverProvider('galah', new HoverProvider()));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider('galah', new DefinitionProvider()));
}
exports.activate = activate;

async function deactivate() {

}
exports.deactivate = deactivate;