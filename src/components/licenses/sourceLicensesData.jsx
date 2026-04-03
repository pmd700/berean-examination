import { SBLGNT_DOCUMENTS } from './sblgntDocs';

export const SOURCE_LICENSE_SECTIONS = [
  {
    title: 'Bible Text Sources',
    description: 'Primary and secondary scripture texts currently used in the app.',
    items: [
      {
        name: 'SBL Greek New Testament (SBLGNT)',
        license: 'CC BY 4.0',
        usage: 'Used as the verse-level Greek source layer for Interlinear Mode.',
        attribution: 'The SBL Greek New Testament is provided under the Creative Commons Attribution 4.0 International License. Formatting was modified during import for verse-level querying and display inside the app.',
        sourceUrl: 'https://sblgnt.com/',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        documents: SBLGNT_DOCUMENTS
      },
      {
        name: 'Unicode/XML Leningrad Codex (UXLC)',
        license: 'Imported source text',
        usage: 'Used as the verse-level Hebrew source layer for Old Testament interlinear display.',
        attribution: 'Unicode/XML Leningrad Codex [UXLC 2.4], Build 27.5, dated 13 Oct 2025, layout: Full; content: Accents. Formatting and markup were normalized during import for verse-level querying, clean app display, and right-to-left rendering.',
        sourceUrl: 'https://tanach.us/Tanach.xml',
        licenseUrl: null
      },
      {
        name: 'English Standard Version (ESV)',
        license: 'Used by permission',
        usage: 'Available as a selectable Bible translation through the ESV API.',
        attribution: 'The Holy Bible, English Standard Version® (ESV® Bible), © 2001 by Crossway, a publishing ministry of Good News Publishers. ESV Text Edition: 2025. Used by permission. All rights reserved.',
        sourceUrl: 'https://api.esv.org/',
        licenseUrl: 'https://www.crossway.org/permissions/'
      },
      {
        name: 'Berean Standard Bible (BSB)',
        license: 'Public domain',
        usage: 'Available as a selectable Bible translation in the reader.',
        attribution: 'The Berean Bible and Majority Bible texts were officially placed into the public domain as of April 30, 2023.',
        sourceUrl: 'https://berean.bible/',
        licenseUrl: 'https://berean.bible/licensing.htm'
      },
      {
        name: 'New Living Translation (NLT)',
        license: 'Used by permission',
        usage: 'Available as a selectable Bible translation through licensed digital access.',
        attribution: 'Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers. All rights reserved.',
        sourceUrl: 'https://www.tyndale.com/',
        licenseUrl: 'https://thebible.org/gt/notices/nlt.html'
      },
      {
        name: 'Literal Standard Version (LSV)',
        license: 'Copyrighted source text',
        usage: 'Available as a selectable Bible translation from the locally imported LSV text source.',
        attribution: 'The Literal Standard Version of The Holy Bible is a registered copyright of Covenant Press and the Covenant Christian Coalition (© 2020).',
        sourceUrl: 'https://www.lsvbible.com/',
        licenseUrl: 'https://www.covenantpress.org/p/literal-standard-version.html'
      },
      {
        name: 'King James Version (KJV)',
        license: 'Public domain',
        usage: 'Available as a selectable Bible translation in the reader.',
        attribution: 'The King James Version is in the public domain.',
        sourceUrl: 'https://bible-api.com/'
      },
      {
        name: 'New American Standard Bible 1995 (NASB 1995)',
        license: 'Used by permission',
        usage: 'Private admin-only translation stored for internal study use and not visible to the public.',
        attribution: 'Scripture quotations taken from the (NASB®) New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995 by The Lockman Foundation. Used by permission. All rights reserved. www.Lockman.org',
        sourceUrl: 'https://www.lockman.org/nasb-1995/',
        licenseUrl: 'https://www.lockman.org/permission-to-quote-copyright-trademark-information/',
        adminOnly: true
      }
    ]
  }
];