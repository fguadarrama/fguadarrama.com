// Local OCR only: the screenshot never leaves this Mac.
import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count == 2 else { fatalError("Usage: weight-ocr.swift image") }
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: url), let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fatalError("Cannot read image")
}
// WhatsApp previews can be very small. Upscaling aids OCR but cannot restore
// missing detail; the importer still requires review before saving anything.
let factor = cg.width < 700 ? 4 : 1
let context = CGContext(data: nil, width: cg.width * factor, height: cg.height * factor,
                        bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
context.interpolationQuality = .high
context.draw(cg, in: CGRect(x: 0, y: 0, width: cg.width * factor, height: cg.height * factor))
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["en-US"]
request.usesLanguageCorrection = false
request.minimumTextHeight = 0.001
do { try VNImageRequestHandler(cgImage: context.makeImage()!).perform([request]) }
catch {
    FileHandle.standardError.write(Data("Local OCR failed: \(error.localizedDescription)\n".utf8))
    exit(1)
}
let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
    guard let candidate = observation.topCandidates(1).first else { return nil }
    let rect = observation.boundingBox
    return ["text": candidate.string, "confidence": candidate.confidence,
            "x": rect.minX, "y": 1 - rect.maxY, "width": rect.width, "height": rect.height]
}
// Xiaomi renders the decimal below the kg label, in a smaller font. Reading
// these two regions separately prevents "64.1" becoming "64:ї" or just "64".
func readWeightRegion(_ box: CGRect) -> [[String: Any]] {
    let pixels = CGRect(x: box.minX * CGFloat(cg.width), y: box.minY * CGFloat(cg.height),
                        width: box.width * CGFloat(cg.width), height: box.height * CGFloat(cg.height))
    guard let cropped = cg.cropping(to: pixels) else { return [] }
    let scale = max(2, 120 / max(1, cropped.height))
    guard let enlarged = CGContext(data: nil, width: cropped.width * scale, height: cropped.height * scale,
                                  bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return [] }
    enlarged.interpolationQuality = .high
    enlarged.draw(cropped, in: CGRect(x: 0, y: 0, width: cropped.width * scale, height: cropped.height * scale))
    let regionRequest = VNRecognizeTextRequest()
    regionRequest.recognitionLevel = .fast
    regionRequest.usesLanguageCorrection = false
    do { try VNImageRequestHandler(cgImage: enlarged.makeImage()!).perform([regionRequest]) } catch { return [] }
    return (regionRequest.results ?? []).compactMap { item in
        guard let text = item.topCandidates(1).first else { return nil }
        return ["text": text.string, "confidence": text.confidence]
    }
}
let weightParts = [
    "integer": readWeightRegion(CGRect(x: 0.35, y: 0.05, width: 0.215, height: 0.036)),
    "decimal": readWeightRegion(CGRect(x: 0.57, y: 0.068, width: 0.072, height: 0.019))
]
let output: [String: Any] = ["width": cg.width, "height": cg.height, "lines": lines, "weightParts": weightParts]
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted, .sortedKeys]))
