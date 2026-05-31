import Foundation
import PDFKit

struct PageText: Codable {
    let page_number: Int
    let text: String
}

struct DocumentText: Codable {
    let path: String
    let page_count: Int
    let pages: [PageText]
    let error: String?
}

func extractDocument(path: String) -> DocumentText {
    let url = URL(fileURLWithPath: path)
    guard let document = PDFDocument(url: url) else {
        return DocumentText(path: path, page_count: 0, pages: [], error: "PDFDocument could not open file")
    }

    var pages: [PageText] = []
    for index in 0..<document.pageCount {
        let page = document.page(at: index)
        pages.append(PageText(page_number: index + 1, text: page?.string ?? ""))
    }

    return DocumentText(path: path, page_count: document.pageCount, pages: pages, error: nil)
}

let paths = Array(CommandLine.arguments.dropFirst())
let documents = paths.map(extractDocument(path:))
let encoder = JSONEncoder()
encoder.outputFormatting = [.withoutEscapingSlashes]

do {
    let data = try encoder.encode(documents)
    FileHandle.standardOutput.write(data)
} catch {
    let message = "{\"error\":\"failed to encode PDF extraction output\"}"
    FileHandle.standardOutput.write(Data(message.utf8))
    exit(1)
}
