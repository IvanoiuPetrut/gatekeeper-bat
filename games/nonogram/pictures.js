// Hand-drawn nonogram pictures in the PUMKYN4 palette. Each must be solvable line by line;
// run `node tools/check-nonograms.js` after editing.
// '.' empty   'p' peach   'e' ember   'u' plum (colours only show once the puzzle is solved)
globalThis.NonogramPictures = [
  // 5 × 5 (easy)
  { size: 5, title: "A heart", art: `
    .e.e.
    eeeee
    eeeee
    .eee.
    ..e..` },
  { size: 5, title: "A pumpkin", art: `
    ..u..
    eeeee
    e.e.e
    eeeee
    .eee.` },
  { size: 5, title: "A ghost", art: `
    .ppp.
    p.p.p
    ppppp
    ppppp
    p.p.p` },
  { size: 5, title: "A mushroom", art: `
    .eee.
    epepe
    eeeee
    ..p..
    .ppp.` },
  { size: 5, title: "A candle", art: `
    ..e..
    .....
    .ppp.
    .ppp.
    ppppp` },
  { size: 5, title: "A little bat", art: `
    p...p
    pp.pp
    ppppp
    .ppp.
    .p.p.` },

  // 8 × 8 (medium)
  { size: 8, title: "A pumpkin", art: `
    ....uu..
    ...uu...
    .eeeeee.
    eeeeeeee
    ee.ee.ee
    eeeeeeee
    ee....ee
    .eeeeee.` },
  { size: 8, title: "A bat", art: `
    p......p
    pp.pp.pp
    pppppppp
    pppppppp
    .pp..pp.
    ..pppp..
    ...pp...
    ........` },
  { size: 8, title: "A ghost", art: `
    ..pppp..
    .pppppp.
    pp.pp.pp
    pp.pp.pp
    pppppppp
    pppppppp
    pppppppp
    p.pp.pp.` },
  { size: 8, title: "A skull", art: `
    .pppppp.
    pppppppp
    p..pp..p
    p..pp..p
    pppppppp
    .pp..pp.
    ..pppp..
    ..p.p.p.` },
  { size: 8, title: "A witch's hat", art: `
    .....u..
    ....uu..
    ...uuu..
    ...uuu..
    ..eeeee.
    ..uuuuu.
    uuuuuuuu
    ........` },
  { size: 8, title: "A potion", art: `
    ...pp...
    ...pp...
    ..pppp..
    .p....p.
    peeeeeep
    peeeeeep
    peeeeeep
    .pppppp.` },

  // 10 × 10 (hard)
  { size: 10, title: "A bat", art: `
    p........p
    pp..pp..pp
    ppp.pp.ppp
    pppppppppp
    pppe..eppp
    pppppppppp
    .pp.pp.pp.
    ....pp....
    ..........
    ..........` },
  { size: 10, title: "A cat", art: `
    p......p..
    pp....pp..
    pppppppp..
    p.pp.ppp..
    pppppppp..
    .pppppp..p
    ..pppp...p
    .pppppp.pp
    pppppppppp
    pppppppp..` },
  { size: 10, title: "A pumpkin", art: `
    ....uu....
    ...uu.....
    .eeeeeeee.
    eeeeeeeeee
    ee..ee..ee
    eee.ee.eee
    eeeeeeeeee
    ee.e..e.ee
    eee....eee
    .eeeeeeee.` },
  { size: 10, title: "A castle", art: `
    u.u....u.u
    uuu....uuu
    uuu.u.uuuu
    uuuuuuuuuu
    uu.uuuu.uu
    uu.uuuu.uu
    uuuuuuuuuu
    uuuu..uuuu
    uuu....uuu
    uuu....uuu` },
  { size: 10, title: "A moon", art: `
    ...pppp...
    ..ppp.....
    .ppp......
    ppp.......
    ppp.......
    ppp.......
    ppp.......
    .ppp......
    ..ppp.....
    ...pppp...` },
  { size: 10, title: "An owl", art: `
    pp......pp
    .pppppppp.
    pp..pp..pp
    p.e.pp.e.p
    pp..pp..pp
    pppp..pppp
    pppppppppp
    .pp.pp.pp.
    .pppppppp.
    ..e....e..` },

  // 15 × 15 (expert)
  { size: 15, title: "A bat under the moon", art: `
    ...........eee.
    ..........ee...
    ..........ee...
    ...........eee.
    p.............p
    pp...........pp
    ppp..p...p..ppp
    pppp.ppppp.pppp
    ppppppppppppppp
    pppp..ppp..pppp
    ppppppppppppppp
    .ppppppppppppp.
    ..pp.ppppp.pp..
    ...p..ppp..p...
    ......p.p......` },
  { size: 15, title: "A jack-o'-lantern", art: `
    .......uu......
    ......uu.......
    ...eeeeeeeee...
    .eeeeeeeeeeeee.
    eeeeeeeeeeeeeee
    eee...eee...eee
    eeee.eeeee.eeee
    eeeeeee.eeeeeee
    eeeeee...eeeeee
    eeeeeeeeeeeeeee
    ee...........ee
    eee.e.e.e.e.eee
    eeee.......eeee
    .eeeeeeeeeeeee.
    ...eeeeeeeee...` },
  { size: 15, title: "A haunted house", art: `
    .......u.......
    ......uuu......
    .....uuuuu.....
    ....uuuuuuu....
    ...uuuuuuuuu...
    ..uuuuuuuuuuu..
    .uuuuuuuuuuuuu.
    ..uu.uuuuu.uu..
    ..u.e.uuu.e.u..
    ..uu.uuuuu.uu..
    ..uuuuuuuuuuu..
    ..uuuu...uuuu..
    ..uuuu...uuuu..
    ..uuuu..euuuu..
    ppppppppppppppp` },
  { size: 15, title: "A cat on a fence", art: `
    ..p.....p......
    ..pp...pp......
    ..ppppppp......
    ..p.ppp.p......
    ..ppppppp......
    ...ppeppp......
    ..ppppppp....p.
    .ppppppppp...p.
    .pppppppppp.pp.
    .ppppppppppppp.
    ..pppppppppp...
    uuuuuuuuuuuuuuu
    u..u..u..u..u..
    uuuuuuuuuuuuuuu
    u..u..u..u..u..` },
];
