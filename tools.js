const path = require('path');
const fs = require('fs')
const { convertCsvToXlsx } = require('@aternus/csv-to-xlsx');
const XlsxPopulate = require('xlsx-populate')

/**
 * 毫秒转为时间字符串
 * @param {number} millSeconds 毫秒
 * @returns 时间字符串 yyyy/MM/dd HH:mm
 */
function formatTimeString(millSeconds) {
    let date = new Date(millSeconds)
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let day = date.getDate()
    let hour = date.getHours()
    hour = hour < 10 ? ('0' + hour) : hour
    let min = date.getMinutes()
    min = min < 10 ? ('0' + min) : min
    let dateStr = `${year}/${month}/${day} ${hour}:${min}`
    return dateStr
}

/**
 * 将json数组转为csv字符串
 * @param {array} items json数组
 * @returns csv样式字符串
 */
function jsonArray2CSVString(items) {
    if (items.length <= 0) {
        return ''
    }
    const header = Object.keys(items[0])
    const headerString = header.join(',')
    // handle null or undefined values here
    const replacer = (key, value) => value ?? '';
    const rowItems = items.map((row) =>
        header
            .map((fieldName) => JSON.stringify(row[fieldName], replacer))
            .join(',')
    );
    // join header and body, and break into separate lines
    const csvstring = [headerString, ...rowItems].join('\r\n');
    return csvstring;
}

/**
 * 将json数组写入csv格式文件中
 * @param {string} csvFilePath csv目标路径
 * @param {array} items json数组
 */
function saveJsonArrayInCSVFile(csvFilePath, items) {
    if (items?.length <= 0) {
        return
    }
    let csvString = jsonArray2CSVString(items)
    saveStringInFile(csvFilePath, csvString)
}

/**
 * 批量将指定文件夹下的csv文件转为xlsx格式
 * @param {string} directory 文件夹
 */
function batchCsv2XlsInDir(directory) {
    /// 获取目录下所有csv文件，批量转换为xlsx文件
    let csvFiles = filterExtFiles(directory, 'csv')
    csvFiles.forEach(csvname => {
        let source = path.join(directory, csvname);
        let xlsname = csvname.replace('.csv', '.xlsx')
        let destination = path.join(directory, xlsname);
        if (fs.existsSync(destination)) {
            fs.unlinkSync(destination)
        }
        try {
            convertCsvToXlsx(source, destination);
        } catch (e) {
            console.error(e.toString());
        }
    })
}

/// 过滤指定文件类型的文件
function filterExtFiles(dir, ext) {
    let matchFiles = []
    fs.readdirSync(dir).forEach(file => {
        if (file.includes(`.${ext}`) && ! /^\..*/.test(file)) {
            matchFiles.push(file)
        }
    })
    return matchFiles
}

/**
 * 将文件夹中所有格的xlsx文件数据合并到一个表格中
 * @param {string} directory 文件夹
 */
function mergeExcelInDir(directory) {

    // 先剔除之前合并后的文件
    let mergedExcelPath = path.join(directory, 'merged.xlsx');
    if (fs.existsSync(mergedExcelPath)) {
        fs.unlinkSync(mergedExcelPath)
    }

    /// get all xlsx file
    let files = filterExtFiles(directory, 'xlsx')
    if (files.length <= 0) {
        return
    }
    let allTasks = []
    files.forEach(xlsname => {
        let filePath = path.join(directory, xlsname)
        allTasks.push(XlsxPopulate.fromFileAsync(filePath))
    })
    Promise.all(allTasks)
        .then(workbooks => {

            // 拿出所有sheets
            var otherSheets = []
            workbooks.forEach((wb, idx) => {
                if (idx > 0) {
                    otherSheets.push(wb.sheets()[0])
                }
            })
            let firstWorkBook = workbooks[0]

            otherSheets.forEach((sheet, idx) => {
                let fileName = files[idx + 1]
                fileName = fileName.match(/\d+/)[0]
                let newSheet = firstWorkBook.addSheet(`${fileName}`)
                const usedRange = sheet.usedRange()
                const oldValues = usedRange.value()
                newSheet.range(usedRange.address()).value(oldValues)
            })
            if (fs.existsSync(mergedExcelPath)) {
                fs.unlinkSync(mergedExcelPath)
            }
            console.log('merge excel in ', mergedExcelPath)
            firstWorkBook.toFileAsync(mergedExcelPath)
        })
}


function saveStringInFile(name, filestr) {
    try {
        let destPath = `${name}`
        if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath)
        }
        fs.writeFileSync(destPath, filestr)
    } catch (error) {
        console.error('write file error ', error)
    }
}



module.exports = {
    formatTimeString,
    saveJsonArrayInCSVFile,
    batchCsv2XlsInDir,
    mergeExcelInDir
}
