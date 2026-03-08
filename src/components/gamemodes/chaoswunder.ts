export type Mission = {
    diceRule: string;
    restriction: string;
};

export const missions: Mission[] = [
  // Max. 3 Würfe, aber bestimmte Augenzahlen dürfen nicht erneut gewürfelt werden
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Einsen dürfen nicht erneut gewürfelt werden.",
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Zweien dürfen nicht erneut gewürfelt werden.",
  },
  {  
    diceRule: "Maximal 3 Würfe.",
    restriction: "Dreien dürfen nicht erneut gewürfelt werden.",
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Vieren dürfen nicht erneut gewürfelt werden.",
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Fünfen dürfen nicht erneut gewürfelt werden.",
  },
  {  
    diceRule: "Maximal 3 Würfe.",
    restriction: "Sechsen dürfen nicht erneut gewürfelt werden.",
  },

  // Mindestens ein Würfel muss pro Wurf abgelegt werden
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Mindestens ein Würfel muss pro Wurf abgelegt werden.",
  },
  {
    diceRule: "Maximal 4 Würfe.",
    restriction: "Mindestens ein Würfel muss pro Wurf abgelegt werden.",
  },
  {
    diceRule: "Maximal 5 Würfe.",
    restriction: "Mindestens ein Würfel muss pro Wurf abgelegt werden.",
  },

  // Alle Würfel müssen gleichzeitig geworfen werden
  {
    diceRule: "Maximal 1 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
  },
  {
    diceRule: "Maximal 2 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
  },
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
  },
  {
    diceRule: "Maximal 4 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
  },
  {
    diceRule: "Maximal 5 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
  },

  {
    diceRule: "Maximal 4 Würfe.",
    restriction: "Alle Würfel müssen gleichzeitig geworfen werden. ",
  },

  // Es dürfen nur bestimmte Augenzahlen abgelegt werden
  {
    diceRule: "Maximal 3 Würfe",
    restriction: "Es dürfen nur gerade Zahlen (2,4,6) abgelegt werden",
  },
    {
    diceRule: "Maximal 4 Würfe",
    restriction: "Es dürfen nur gerade Zahlen (2,4,6) abgelegt werden",
  },
  {
    diceRule: "Maximal 3 Würfe",
    restriction: "Es dürfen nur ungerade Zahlen (1,3,5) abgelegt werden",
  },
  {
    diceRule: "Maximal 4 Würfe",
    restriction: "Es dürfen nur ungerade Zahlen (1,3,5) abgelegt werden",
  },

  // Spezielle Würfelregeln
  {
    diceRule: "Maximal 3 Würfe.",
    restriction: "Ein zusätzlicher Wurf bei mindestens einer 6 im letzten Wurf. ",
  },
];