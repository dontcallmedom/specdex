import fs from "fs/promises";
import html, { join } from 'escape-html-template-tag';
const {safe} = html;

import  { expandCrawlResult } from 'reffy/src/lib/util.js';

let results;

// DRY with webdex - mv to specdfn-contract?
const typeInfo = {
  "grammar": {
    human: "grammar",
    area: "grammar"
  },
  "exception": {
    human: "exception",
    area: "webidl"
  },
  "value": {
    human: "CSS value",
    typeOfFor: ["descriptor", "property", "type", "function", "at-rule"],
    area: "css",
    caseInsensitive: true
  },
  "at-rule": {
    human: "CSS @rule",
    area: "css",
    // if a term of a given type appears several times,
    // they designate the same thing
    exclusiveNamespace: true,
    caseInsensitive: true
  },
  "descriptor": {
    human: "CSS descriptor",
    typeOfFor: ["at-rule"],
    area: "css",
    exclusiveNamespace: true,
    caseInsensitive: true
  },
  "selector": {
    human: "CSS selector",
    area: "css",
    exclusiveNamespace: true,
    caseInsensitive: true
  },
  "type": {
    human: "CSS type",
    typeOfFor: ["descriptor", "property", "function"],
    area: "css",
    exclusiveNamespace: true,
    caseInsensitive: true
  },
  "property": {
    human: "CSS property",
    area: "css",
    exclusiveNamespace: true,
    caseInsensitive: true
  },
  "function": {
    human: "CSS function",
    typeOfFor: ["descriptor", "property", "type", "function", "at-rule"],
    area: "css",
    caseInsensitive: true
  },
  "dfn": {
    human: "concept",
    area: "concept"
  },
  "event": {
    human: "event",
    typeOfFor: ["interface"],
    area: "webidl"
  },
  "const": {
    human: "WebIDL constant",
    typeOfFor: ["interface", "namespace", "callback"],
    area: "webidl"
  },
  "interface": {
    human: "WebIDL interface",
    area: "webidl",
    exclusiveNamespace: true
  },
  "namespace": {
    human: "WebIDL namespace",
    area: "webidl",
    exclusiveNamespace: true
  },
  "method": {
    human: "WebIDL operation",
    typeOfFor: ["interface", "namespace", "callback"],
    area: "webidl"
  },
  "attribute": {
    human: "WebIDL attribute",
    typeOfFor: ["interface", "namespace"],
    area: "webidl"
  },
  "dictionary": {
    human: "WebIDL dictionary",
    area: "webidl",
    exclusiveNamespace: true
  },
  "enum": {
    human: "WebIDL enumeration",
    area: "webidl",
    exclusiveNamespace: true
  },
  "enum-value": {
    human: "value",
    typeOfFor: ["enum"],
    area: "webidl"
  },
  "abstract-op": {
    human: "algorithm",
    area: "concept"
  },
  "http-header": {
    human: "HTTP header",
    area: "http",
    exclusiveNamespace: true,
    caseInsensitive: true
  },
  'attr-value': {
    human: 'value',
    typeOfFor: ["element-attr"],
    area: "markup"
  },
  'element-attr': {
    human: 'markup attribute',
    typeOfFor: ["element"],
    area: "markup",
    caseInsensitive: true
  },
  'typedef': {
    human: 'WebIDL type alias',
    area: "webidl",
    exclusiveNamespace: true
  },
  'dict-member': {
    human: 'WebIDL dictionary member',
    typeOfFor: ["dictionary"],
    area: "webidl"
  },
  'callback': {
    human: 'WebIDL callback',
    area: "webidl",
    exclusiveNamespace: true
  },
  "constructor": {
    human: "WebIDL constructor",
    area: "webidl",
    exclusiveNamespace: true
  },
  "element": {
    human: "markup element",
    area: "markup",
    caseInsensitive: true
  },
  "element-state": {
    human: "state of markup element",
    area: "markup",
    caseInsensitive: true
  },
  "extended-attribute":{
    "human": "WebIDL extended attribute",
    area: "webidl",
    exclusiveNamespace: true
  },
  "permission": {
    human: 'permission name',
    area: "webidl",
    exclusiveNamespace: true
  },
  "cddl-module": {
    area: "cddl",
    human: "CDDL module"
  },
  "cddl-type": {
    area: "cddl",
    human: "CDDL type"
  },
  "cddl-parameter": {
    area: "cddl",
    human: "CDDL parameter"
  },
  "cddl-value": {
    area: "cddl",
    human: "CDDL value"
  },
  "cddl-key": {
    area: "cddl",
    human: "CDDL key"
  }
};


async function generatePage(path, title, content, options = {}) {
  await fs.writeFile(path, `---
title: "${title}"
layout: base
${path.includes('/') ? "base: ../" : ""}
${Object.keys(options).map(k => `${k}: "${options[k]}"
`)}
---
${content}`);
}

(async function() {
  const jsonIndex = await fs.readFile("./webref/ed/index.json", "utf-8");
  const index = JSON.parse(jsonIndex);
  results = (await expandCrawlResult(index, './webref/ed/', ['backrefs'])).results;
  const specsWithDefs = [];
  for (const spec of results) {
    const terms = [];
    const referencers = new Set();
    for (const ref of (spec.backrefs || []).sort((a, b) => a.linkingText[0].localeCompare(b.linkingText[0]))) {
      ref.referencedBy.forEach(s => referencers.add(s.shortname));
      terms.push(html`<dt><a class="${typeInfo[ref.type]?.area}" href="${ref.href}">${ref.type !== "dfn" && ref.type !== "abstract-op" ? html`<code>` : ""}${ref.linkingText[0]}${ref.type !== "dfn" && ref.type !== "abstract-op" ? html`</code>` : ""}</a></dt>
<dd>Referenced by: ${join(ref.referencedBy.map(s => html`<a href="${s.url}">${s.title}</a>`, ", "))}</dd>`);
    }
    if (terms.length) {
      spec.numberOfReferencers = referencers.size;
      await generatePage(`${spec.shortname}.html`, `Definitions in ${spec.title}`, html`<p>Referenced by ${spec.numberOfReferencers} other specifications.</p><dl>${join(terms, "\n")}</dl>`);
      specsWithDefs.push(spec);
    }

  }
  specsWithDefs.sort((a, b) => a.title.localeCompare(b.title));
  const indexContent = html`<p>This site collects indicate which specifications reference terms defined by <a href="https://github.com/w3c/browser-specs">Web specifications</a></p><ol>${join(specsWithDefs.map(s => html`<li><a href="${s.shortname}.html">${s.title}</a> (referenced by ${s.numberOfReferencers} spec${s.numberOfReferencers > 1 ? "s" : ""})</li>`), "\n")}</ol>`;

  await generatePage("index.html", "SpecDex: Web specs backreferences", indexContent);
})();
