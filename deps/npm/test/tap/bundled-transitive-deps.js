'use strict'
var fs = require('fs')
var path = require('path')
var test = require('tap').test
var Tacks = require('tacks')
var File = Tacks.File
var Dir = Tacks.Dir
var common = require('../common-tap.js')
var npm = require('../../lib/npm.js')
var tar = require('tar')
var mkdirp = require('mkdirp')
var testdir = common.pkg
var packed = path.join(testdir, 'packed')

var fixture = new Tacks(
  Dir({
    'package.json': File({
      name: 'bundled-transitive-deps',
      version: '1.0.0',
      dependencies: {
        'a': '1.0.0',
        '@c/d': '1.0.0'
      },
      bundleDependencies: [
        'a',
        '@c/d'
      ]
    }),
    node_modules: Dir({
      'a': Dir({
        'package.json': File({
          name: 'a',
          version: '1.0.0',
          dependencies: {
            'b': '1.0.0'
          }
        })
      }),
      'b': Dir({
        'package.json': File({
          name: 'b',
          version: '1.0.0'
        })
      }),
      '@c/d': Dir({
        'package.json': File({
          name: '@c/d',
          version: '1.0.0'
        }),
        'node_modules': Dir({
          'e': Dir({
            'package.json': File({
              name: 'e',
              version: '1.0.0'
            })
          })
        })
      })
    })
  })
)

function setup () {
  cleanup()
  fixture.create(testdir)
}

function cleanup () {
  fixture.remove(testdir)
}

test('setup', function (t) {
  setup()
  npm.load({}, t.end)
})

function exists (t, filename) {
  t.doesNotThrow(filename + ' exists', function () {
    fs.statSync(filename)
  })
}

test('bundled-transitive-deps', function (t) {
  common.npm(['pack'], {cwd: testdir}, thenCheckPack)
  function thenCheckPack (err, code, stdout, stderr) {
    if (err) throw err
    var tarball = stdout.trim()
    t.comment(stderr.trim())
    t.is(code, 0, 'pack successful')
    mkdirp.sync(packed)
    tar.extract({
      file: path.join(testdir, tarball),
      cwd: packed,
      strip: 1,
      sync: true
    })
    var transitivePackedDep = path.join(packed, 'node_modules', 'b')
    exists(t, transitivePackedDep)
    var nestedScopedDep = path.join(packed, 'node_modules', '@c', 'd', 'node_modules', 'e')
    exists(t, nestedScopedDep)
    t.end()
  }
})

test('cleanup', function (t) {
  cleanup()
  t.end()
})
