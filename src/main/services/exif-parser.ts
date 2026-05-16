import exifr from 'exifr'

export interface ExifData {
  shot_at?: string
  camera_model?: string
  lens_model?: string
  iso?: number
  aperture?: number
  shutter_speed?: string
  width?: number
  height?: number
  gps_lat?: number
  gps_lng?: number
}

export async function parseExif(filePath: string): Promise<ExifData> {
  try {
    const exif = await exifr.parse(filePath, {
      pick: ['DateTimeOriginal', 'Model', 'LensModel', 'ISO', 'FNumber', 'ExposureTime', 'ImageWidth', 'ImageHeight', 'GPSLatitude', 'GPSLongitude']
    })

    if (!exif) return {}

    return {
      shot_at: exif.DateTimeOriginal?.toISOString(),
      camera_model: exif.Model,
      lens_model: exif.LensModel,
      iso: exif.ISO,
      aperture: exif.FNumber,
      shutter_speed: exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : undefined,
      width: exif.ImageWidth || exif.ExifImageWidth,
      height: exif.ImageHeight || exif.ExifImageHeight,
      gps_lat: exif.GPSLatitude,
      gps_lng: exif.GPSLongitude
    }
  } catch {
    return {}
  }
}
