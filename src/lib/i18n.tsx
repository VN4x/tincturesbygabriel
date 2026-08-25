import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "et" | "en";

const STORAGE_KEY = "metsavagi.lang";

type Dict = Record<string, { et: string; en: string }>;

export const dict: Dict = {
  "nav.book": { et: "Raamat", en: "The book" },
  "nav.inside": { et: "Sisu", en: "Inside" },
  "nav.access": { et: "Ligipääs", en: "Access" },
  "nav.author": { et: "Autor", en: "Author" },
  "nav.read": { et: "VAATA SISSE", en: "Read free" },
  "nav.signin": { et: "Sisene", en: "Sign in" },
  "nav.signout": { et: "Logi välja", en: "Sign out" },
  "nav.login": { et: "Logi sisse", en: "Sign in" },

  "hero.eyebrow": { et: "Gabriel Corpus · Maagia Doktor", en: "Gabriel Corpus · Doctor of Magic" },
  "hero.title": { et: "Metsa vägi ja tervis", en: "The Power of the Forest and Health" },
  "hero.sub": {
    et: "Puude ja põõsaste tinktuurid, vana pärimus ja ultraheli-tehnoloogia — 29 peatükki metsa väest, mis on pudelisse püütud.",
    en: "Tinctures of trees and shrubs, old lore and ultrasonic technology — 29 chapters on the power of the forest, caught in a bottle.",
  },
  "hero.quote": {
    et: "„Tinktuur on kontsentreeritud aeg.“",
    en: "\u201cA tincture is concentrated time.\u201d",
  },
  "hero.cta": { et: "TUTVU RAAMATUGA", en: "Open a free passage" },
  "hero.cta2": { et: "Logi sisse", en: "Sign in" },
  "hero.meta": {
    et: "131 lehekülge · eesti ja inglise keeles · digitaalne lugemisõigus",
    en: "131 pages · Estonian and English · digital reading access",
  },

  "premise.kicker": { et: "Kolm sammast", en: "Three pillars" },
  "premise.title": { et: "Mets kui apteek", en: "The forest as an apothecary" },
  "premise.1.h": { et: "Puud, mitte rohulibled", en: "Trees, not blades of grass" },
  "premise.1.p": {
    et: "Puudest on ravimtaimedena kirjutatud teenimatult vähe. Nad on võimsad, pikaealised ja alati leitavad — nende vägi on monumentaalne.",
    en: "Trees have been undeservedly overlooked as medicinal plants. They are powerful, long-lived and always findable — their power is monumental.",
  },
  "premise.2.h": { et: "Kontsentreeritud aeg", en: "Concentrated time" },
  "premise.2.p": {
    et: "Klaaspudelisse püütud aeg: aeg, mil taim kasvas, aeg, mil meister ta korjas, ja aeg, mille sa võtad endale, et terveneda.",
    en: "Time caught in a glass bottle: the time the plant grew, the time the maker gathered it, and the time you take for yourself to heal.",
  },
  "premise.3.h": { et: "Bailey ja Bailly", en: "Bailey and Bailly" },
  "premise.3.p": {
    et: "Kaks samanimelist meest — inglise leksikograaf ja prantsuse hellenist — hoiavad silda etümoloogia ja antiikse Nous’i vahel.",
    en: "Two identically named men — an English lexicographer and a French Hellenist — hold the bridge between etymology and the ancient Nous.",
  },

  "inside.kicker": { et: "Sisu", en: "Inside" },
  "inside.title": { et: "Tinktuuririiul", en: "The tincture shelf" },
  "inside.lead": {
    et: "Iga peatükk avab ühe puu või taime: pärimus, maagiline tähendus, toimeained, tooraine ettevalmistus, ultrahelitöötlus ja doseerimine.",
    en: "Each chapter opens one tree or plant: lore, magical meaning, active compounds, preparation, ultrasonic extraction and dosage.",
  },
  "inside.locked": { et: "Lukus", en: "Locked" },
  "inside.chapters": { et: "peatükki", en: "chapters" },
  "inside.words": { et: "sõna", en: "words" },
  "inside.charms": { et: "ajaloolist loitsu", en: "historical charms" },
  "inside.all": { et: "Ava lugemisvaade", en: "Open the reader" },

  "sample.kicker": { et: "Tasuta proov", en: "Free sample" },
  "sample.title": { et: "Raamat on tutvumiseks avatud", en: "Every visit unlocks a different passage" },
  "sample.p": {
    et: "Lugemisvaade valib igale külastajale mõne peatüki ja näitab seda tervikuna. Tõelistele huvilistele aga -\u00a0 registreeri korra ja kogu raamat koos tinktuurimaagiaga on su jaoks alatiseks avatud.\nÜlejäänude jaoks jäävad Doktor Corpuse maagia saladused hämarusse...",
    en: "The reader picks a few chapters at random each time and shows them in full. The rest stays in the dark — locked text is never sent to your browser at all.",
  },
  "sample.cta": { et: "Ava lugemisvaade", en: "Open the reader" },

  "access.kicker": { et: "Ligipääs", en: "Access" },
  "access.title": { et: "Kolm ust", en: "Three doors" },
  "access.free.h": { et: "Tasuta sirvimine", en: "Free browsing" },
  "access.free.price": { et: "0 €", en: "€0" },
  "access.free.p": {
    et: "Juhuslikud avatud lõigud saamaks aimu raamatu olemusest ja sisu väärtusest oma tervise ja tegude mõjutamisel tinktuurimaagiaga.",
    en: "Random open passages on every visit, the full contents, tables and the introduction.",
  },
  "access.free.cta": { et: "Alusta lugemist", en: "Start reading" },
  "access.full.h": { et: "Täisligipääs", en: "Full access" },
  "access.full.price": { et: "5 €", en: "€5" },
  "access.full.p": {
    et: "Kogu raamat mõlemas keeles, järjehoidjad ja lugemisprogress.\nÜhekordne makse, alatine ligipääs.",
    en: "The whole book in both languages, bookmarks and reading progress. One payment, access stays.",
  },
  "access.full.cta": { et: "Ava täisligipääs", en: "Unlock full access" },
  "access.friend.h": { et: "Sõbrakonto", en: "Friend account" },
  "access.friend.price": { et: "Kutsega", en: "By invitation" },
  "access.friend.p": {
    et: "Autori loodud konto.\u00a0\nSisene koodiga, mis sulle saadeti.",
    en: "An account created by the author for family and collaborators. Enter with the code you were sent.",
  },
  "access.friend.cta": { et: "Sisesta kutse", en: "Enter invitation" },
  "access.note": {
    et: "Sisselogimine käib ühekordse koodiga e-posti teel — paroole pole vaja meeles pidada.",
    en: "Sign-in works with a one-time code by e-mail — no passwords to remember.",
  },
  "access.badge": { et: "Soovitatud", en: "Recommended" },

  "author.kicker": { et: "Autor", en: "Author" },
  "author.title": { et: "Gabriel Corpus", en: "Gabriel Corpus" },
  "author.p1": {
    et: "Maagia Doktor. Õppinud Indias ja Kreeka ülikoolides. Kirjutab taimedest keele ja tähenduse kaudu: etümoloogia, antiikne mõte ja rahvapärimus koos tänapäevase ekstraktsioonitehnikaga. Aeg avaldada saladuses hoitud maagiatehnikad asjade mõjude saavutamiseks",
    en: "Doctor of Magic. Writes about plants through language and meaning: etymology, ancient thought and folk lore alongside modern extraction technique.",
  },
  "author.p2": {
    et: "„Tervise poole püüdlemine on kaugenemine jubedatest kirgedest. See ongi tõeline vaimne praktika.“",
    en: "\u201cStriving toward health is a moving away from dreadful passions. That is true spiritual practice.\u201d",
  },

  "faq.kicker": { et: "Küsimused", en: "Questions" },
  "faq.title": { et: "Enne kui alustad", en: "Before you begin" },
  "faq.1.q": { et: "Kas raamat on ka inglise keeles?", en: "Is the book also in English?" },
  "faq.1.a": {
    et: "Jah, raamat ilmub eesti ja inglise keeles. Keelt saad vahetada üleval paremal; lugemisõigus kehtib mõlemale versioonile.",
    en: "Yes, the book is published in Estonian and English. Switch language at the top right; reading access covers both versions.",
  },
  "faq.2.q": { et: "Kuidas sisselogimine käib?", en: "How does signing in work?" },
  "faq.2.a": {
    et: "Sisestad oma e-posti aadressi ja saad ühekordse koodi. Koodi kehtivus on lühike ja paroole pole olemas.",
    en: "You enter your e-mail address and receive a one-time code. The code is short-lived and there are no passwords.",
  },
  "faq.3.q": { et: "Kas ma saan raamatu faili?", en: "Do I get a book file?" },
  "faq.3.a": {
    et: "Ligipääs on veebilugemine — tekst tarnitakse peatükkide kaupa sinu kontole. Nii püsib raamat autori käes.",
    en: "Access is web reading — the text is delivered chapter by chapter to your account. That keeps the book in the author's hands.",
  },
  "faq.4.q": { et: "Kas see asendab arstiabi?", en: "Does this replace medical care?" },
  "faq.4.a": {
    et: "Ei. Raamat on pärimuse ja tehnika käsitlus, mitte ravijuhend. Tugevatoimeliste taimede puhul on täpsus ja mõõdukus hädavajalikud.",
    en: "No. The book is a treatment of lore and technique, not a medical guide. With potent plants, precision and moderation are essential.",
  },

  "cta.title": { et: "Astu metsa sisse", en: "Step into the forest" },
  "cta.p": {
    et: "Ava tasuta lõik ja vaata, kas see keel kõnetab sind.",
    en: "Open a free passage and see whether this language speaks to you. The rest waits, locked.",
  },

  "footer.rights": {
    et: "Kõik õigused kaitstud. Reprodutseerimine ilma autori kirjaliku loata on keelatud.",
    en: "All rights reserved. Reproduction without the author's written permission is prohibited.",
  },
  "footer.set": { et: "Tekst ja koostamine: Gabriel Corpus, raamatu koostamisel ja kujundamisel on kasutatud Ai tööriistu", en: "Text and compilation: Gabriel Corpus · Printed in Estonia" },

  "reader.back": { et: "Tagasi avalehele", en: "Back to the landing page" },
  "reader.title": { et: "Lugemisvaade", en: "Reader" },
  "reader.free": { et: "Avatud proovilõik", en: "Open sample passage" },
  "reader.locked": { et: "Lukus", en: "Locked" },
  "reader.lockedNote": {
    et: "See peatükk on lukus. Täisligipääsuga avaneb kogu tekst.",
    en: "This chapter is locked. Full access opens the whole text.",
  },
  "reader.unlock": { et: "Ava täisligipääs", en: "Unlock full access" },
  "reader.reshuffle": { et: "Sega proovilõigud uuesti", en: "Reshuffle the sample" },
  "reader.contents": { et: "Sisukord", en: "Contents" },
  "reader.textSize": { et: "Kirja suurus", en: "Text size" },
  "reader.page": { et: "lk", en: "p." },
  "reader.openCount": {
    et: "avatud peatükki sellel külastusel",
    en: "chapters open on this visit",
  },
  "reader.bar": {
    et: "Loed tasuta proovi. Täisligipääs avab kõik 29 peatükki mõlemas keeles.",
    en: "You are reading the free sample. Full access opens all 29 chapters in both languages.",
  },
  "reader.enNote": {
    et: "Ingliskeelne väljaanne on ettevalmistamisel — proovilõigud kuvatakse esialgu originaalkeeles.",
    en: "The English edition is in preparation — sample passages are shown in the original language for now.",
  },
  "reader.loading": { et: "Metsa avamine…", en: "Opening the forest…" },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict | string) => string;
};

const LangContext = createContext<Ctx>({
  lang: "et",
  setLang: () => {},
  t: (k) => String(k),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("et");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "et" || stored === "en") setLangState(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = dict[key];
      return entry ? entry[lang] : key;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
