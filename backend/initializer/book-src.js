const fs = require('fs')
const path = require('path')
const Book = require('../models/book')
const Author = require('../models/author')
const config = require('../config')

function fileName2BookInfo (fileName) {
  let match = fileName.match(/^\[.*\]/)
  if (!match) return null
  return {
    author: match[0].replace(/\[|\]/g, ""),
    title: fileName.replace(/^\[.*\] /, "")
  }
}

async function numberingImages (oldDir, newDir) {

  function renameImage (file, index) {
    return new Promise((resolve, reject) => {
      const newFile = path.join(newDir, index.toString() + path.extname(file))
      if (fs.existsSync(newFile)) return reject(`${newFile} is already exists.`)
      fs.rename(path.join(oldDir, file), newFile, (err) => {
        if (err) return reject(err)
        return resolve(newFile)
      })
    })
  }

  let files = fs.readdirSync(oldDir)
  let promises = []
  files.forEach ((file, index) => {
    if (/^\./.test(file)) return
    if (!/\.(jpg|png|jpeg)$/.test(file)) return
    promises.push(renameImage(file, index))
  })
  return Promise.all(promises)
}

module.exports = {
  async init () {

    let directories = fs.readdirSync(config.dir.raw)

    for (let directory of directories) {

      const bookRawDir = path.join(config.dir.raw, directory)

      // File Detail
      let fileStat = fs.statSync(bookRawDir)
      if (!fileStat.isDirectory()) continue
      let bookInfo = fileName2BookInfo(directory)
      if (!bookInfo) continue

      // DB
      let author = await Author.findOrCreate({
        name: bookInfo.author
      })
      let book = await Book.findOrCreate({
        title: bookInfo.title,
        author: author._id
      })

      const bookSrcDir = path.join(config.dir.src, book.uuid)

      // mkdir
      if (!fs.existsSync(bookSrcDir)) fs.mkdirSync(bookSrcDir)

      // Trans Files
      await numberingImages(bookRawDir, bookSrcDir)
    }

    return true
  }
}
