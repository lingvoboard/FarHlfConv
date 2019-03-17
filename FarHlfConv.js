'use strict'

/*
node FarHlfConv.js input.txt output.txt
*/

const hrstart = process.hrtime()
const fs = require('fs')
const readline = require('readline')

let arr1 = []
let encoding = 'utf8'

const colors = Object.assign(Object.create(null), {
  '0': '#000000',
  '1': '#000080',
  '2': '#008000',
  '3': '#008080',
  '4': '#800000',
  '5': '#800080',
  '6': '#808000',
  '7': '#C0C0C0',
  '8': '#808080',
  '9': '#0000FF',
  A: '#00FF00',
  B: '#00FFFF',
  C: '#FF0000',
  D: '#FF00FF',
  E: '#FFFF00',
  F: '#FFFFFF'
})

let byteCount = 0
let fileSize = 0

function guessEncoding (path) {
  const BOM_0 = 0xff
  const BOM_1 = 0xfe

  try {
    const fd = fs.openSync(path, 'r')
    const bf = Buffer.alloc(2)
    fs.readSync(fd, bf, 0, 2, 0)
    fs.closeSync(fd)
    return bf[0] === BOM_0 && bf[1] === BOM_1 ? 'utf16le' : 'utf8'
  } catch (e) {
    console.error(`Error: ${e.message}.`)
    return null
  }
}

if (process.argv.length === 4 || fileExists(process.argv[2])) {
  main()
} else {
  console.log('Invalid command line.')
  process.exit()
}

function pb (edge = 0) {
  const rl = require('readline')

  const DEFAULT_FREQ = 500
  const HUNDRED_PERCENT = 100
  const PB_LENGTH = 50
  const PB_SCALE = HUNDRED_PERCENT / PB_LENGTH

  const NANOSECONDS_PER_SECOND = 1e9

  const hrStart = process.hrtime()

  function clearLine () {
    rl.cursorTo(process.stdout, 0)
    rl.clearLine(process.stdout, 0)
  }

  function getTimePast () {
    const hrEnd = process.hrtime(hrStart)
    return `${(
      (hrEnd[0] * NANOSECONDS_PER_SECOND + hrEnd[1]) /
      NANOSECONDS_PER_SECOND
    ).toFixed(1)} s`
  }

  return {
    edge,
    stat: 0,

    start (freq = DEFAULT_FREQ) {
      this.updater = setInterval(() => {
        this.update()
      }, freq)
    },

    update (stat = this.stat) {
      const statPercent =
        stat === this.edge || stat > this.edge
          ? HUNDRED_PERCENT
          : (stat / this.edge) * HUNDRED_PERCENT

      const barsNumber = Math.floor(statPercent / PB_SCALE)
      const padsNumber = PB_LENGTH - barsNumber

      clearLine()
      process.stdout.write(
        `${'█'.repeat(barsNumber)}${'░'.repeat(
          padsNumber
        )} ${statPercent.toFixed(
          1
        )}%  ${getTimePast()} (${stat.toLocaleString()} of ${this.edge.toLocaleString()})`
      )
    },

    end () {
      clearInterval(this.updater)
      this.stat = this.edge
      this.update()
      console.log('\n')
    },

    clear () {
      clearInterval(this.updater)
      clearLine()
    }
  }
}

function main () {
  const fs = require('fs')
  encoding = guessEncoding(process.argv[2])
  fileSize = fs.statSync(process.argv[2])['size']

  let LineCounter = 0

  const readline = require('readline')
  const reader = readline.createInterface({
    input: fs.createReadStream(process.argv[2], encoding),
    terminal: false,
    historySize: 0,
    output: null,
    crlfDelay: Infinity
  })

  const pbAsync = pb(fs.statSync(process.argv[2]).size)

  pbAsync.start()

  reader
    .on('line', function (line) {
      LineCounter++

      pbAsync.stat += Buffer.byteLength(line, encoding) + 1

      line = line.replace(/^\uFEFF/, '')

      processLine(line)
    })
    .on('close', () => {
      processArray()

      byteCount = fileSize

      pbAsync.end()
    })
}

function processLine (s) {
  s = s.replace(/^@.*=.*$/, '<del>')
  s = s.replace(/^\.Language.*$/, '<del>')
  s = s.replace(/^\.Options.*$/, '<del>')

  s = s.replace(/&/g, '&amp;')
  s = s.replace(/</g, '&lt;')
  s = s.replace(/>/g, '&gt;')

  s = s.replace(/~~/g, '&tilde;&tilde;')
  s = s.replace(/##/g, '&num;&num;')
  s = s.replace(/@@/g, '&commat;&commat;')

  s = s.replace(/#([^#]+)#/g, (s, m1) => {
    return `<span class="seltext">${m1}</span>`
  })

  s = s.replace(/~([^~]+)~@([^@]+)@/g, (s, m1, m2) => {
    if (/^(file|ftp|http|mailto|news|telnet):/.test(m2)) {
      return `<a href="${m2}">${m1}</a>`
    } else {
      return `<a href="#${m2}">${m1}</a>`
    }
  })

  s = s.replace(/^\$(.*)$/, '<div class="notscroll">$1</div>')

  s = s.replace(/^@(.*)$/g, (s, m1) => {
    let anchorlink = ''
    if (!/Topic=/.test(m1)) {
      anchorlink = `<a id="${m1}"></a>`
    }
    return `<div class="topic">${anchorlink}<span>@${m1}</span></div>`
  })

  s = s.replace(/&lt;wrap&gt;/g, '<wrap>')
  s = s.replace(/&lt;del&gt;/g, '<del>')

  s = s.replace(/\^<wrap>/g, '<circumflex><wrap>')
  s = s.replace(
    /<div class="notscroll">\^/,
    '<div class="notscroll"><circumflex>'
  )
  s = s.replace(/^\^/, '<circumflex>')
  s = s.replace(/\x5c\x5c/g, '&#92;')

  s = s.replace(/&tilde;&tilde;/g, '~')
  s = s.replace(/&num;&num;/g, '#')
  s = s.replace(/&commat;&commat;/g, '@')

  s = s.replace(/\\([0123456789ABCDEF]{2}|-)/gi, (s, m1) => {
    if (m1 === '-') {
      return `</span>`
    } else {
      if (m1[0] === m1[0]) {
        var bg = colors[m1[0].toUpperCase()]
        var fg = colors[m1[1].toUpperCase()]
      } else {
        var bg = colors[m1[1].toUpperCase()]
        var fg = colors[m1[0].toUpperCase()]
      }

      return `<span style="color:${fg};background-color:${bg}">`
    }
  })

  s = s.replace(
    /\\\(T([0123456789ABCDEF]+):T([0123456789ABCDEF]+)\)/g,
    (s, m1, m2) => {
      return `<span style="color:#${m1};background-color:#${m2}">`
    }
  )

  if (s !== '<del>') {
    arr1.push(s)
  }
}

function processArray () {
  const arr2 = []

  for (let i = 0; i < arr1.length; i++) {
    if (!/^(<div| )/.test(arr1[i])) {
      if (!/^  /.test(arr1[i])) {
        if (i > 0) {
          if (arr1[i].trim() === '') {
            arr2.push(arr1[i])
          } else {
            if (arr2[arr2.length - 1].trim() !== '') {
              arr2[arr2.length - 1] += ` ${arr1[i]}`
            } else {
              arr2.push(arr1[i])
            }
          }
        } else {
          arr2.push(arr1[i])
        }
      } else {
        arr2.push(arr1[i])
      }
    } else {
      arr2.push(arr1[i])
    }
  }

  arr1.length = 0
  arr1 = arr2.slice(0)
  arr2.length = 0

  for (let i = 0; i < arr1.length; i++) {
    if (!/^<div/.test(arr1[i])) {
      if (arr1[i].trim() !== '') {
        arr1[i] = `<div class="m1">${arr1[i]}</div>`
        arr1[i] = arr1[i].replace(
          /<div class="m1">(.*?)<wrap>/,
          '<div class="m1 wrap">$1'
        )
      }
    }
  }

  let head = String.raw`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">
  <style>
  body {
    background-color: #000080;
  }
  .seltext {
    color: white;
  }
  .topic {
    border-bottom:1px solid black;
  }
  .topic span{
    display: none;
  }
  pre {
    white-space: pre-wrap;       /* css-3 */
    white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
    white-space: -pre-wrap;      /* Opera 4-6 */
    white-space: -o-pre-wrap;    /* Opera 7 */
    word-wrap: break-word;       /* Internet Explorer 5.5+ */   
  }
  a {
    color: yellow;
    text-decoration: none;
  }
  .m1 {
    padding: 0 20px 0 20px; 
    display: inline-block;
  }
  .notscroll {
    text-transform: uppercase;
    border-bottom: 1px solid black;
    padding-bottom: 20px;
  }

  .displaynot{
    display: none;
  }

  #content{
    margin: 0px auto;
    width: 90% !important;
    background-color: #008080;
    padding: 5px;
  }

  .border{
    border:1px solid black;
  }
  </style>
  <title></title>
</head>
<body><div id="content"><div class="border"><pre>
`

  let foot = String.raw`
</pre></div></div></body>
</html>
`

  const output = fs.openSync(process.argv[3], 'w')

  fs.writeSync(output, `\uFEFF${head}\n`, null, encoding)

  for (let v of arr1) {
    fs.writeSync(output, `${v}\n`, null, encoding)
  }

  fs.writeSync(output, `${foot}\n`, null, encoding)
}
