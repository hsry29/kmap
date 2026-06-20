import { formatDriverKoLines, hasDriverStreetAddress } from './placeDisplay'

function kakaoReady() {
  return Boolean(window.kakao?.maps?.services)
}

function kakaoStatusOk(status) {
  return status === window.kakao.maps.services.Status.OK
}

/** @param {string | undefined} placeUrl */
export function extractKakaoPlaceId(placeUrl) {
  const m = String(placeUrl ?? '').match(/place\.map\.kakao\.com\/(\d+)/i)
  return m ? m[1] : ''
}

/** @param {Record<string, unknown>} place */
export function resolveKakaoPlaceId(place) {
  return String(place?.kakaoId ?? place?.kakaoPlaceId ?? extractKakaoPlaceId(place?.placeUrl) ?? '').trim()
}

/** @param {number} lat @param {number} lng */
export function fetchAddressByCoords(lat, lng) {
  return new Promise((resolve) => {
    if (!kakaoReady() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      resolve({ road: '', jibun: '' })
      return
    }
    const geocoder = new window.kakao.maps.services.Geocoder()
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (!kakaoStatusOk(status) || !Array.isArray(result) || result.length === 0) {
        resolve({ road: '', jibun: '' })
        return
      }
      resolve({
        road: String(result[0]?.road_address?.address_name ?? '').trim(),
        jibun: String(result[0]?.address?.address_name ?? '').trim(),
      })
    })
  })
}

/**
 * @param {string} kakaoId
 * @param {string} name
 * @param {number} lat
 * @param {number} lng
 */
export function fetchKakaoPlaceById(kakaoId, name, lat, lng) {
  return new Promise((resolve) => {
    if (!kakaoReady() || !kakaoId) {
      resolve(null)
      return
    }
    const ps = new window.kakao.maps.services.Places()
    const query = String(name ?? '').trim() || ' '
    const opts = {}
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      opts.location = new window.kakao.maps.LatLng(lat, lng)
      opts.radius = 500
    }
    ps.keywordSearch(query, (data, status) => {
      if (!kakaoStatusOk(status) || !Array.isArray(data)) {
        resolve(null)
        return
      }
      const hit =
        data.find((row) => String(row.id) === String(kakaoId)) ??
        data.find(
          (row) =>
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            Math.abs(Number(row.y) - lat) < 0.0003 &&
            Math.abs(Number(row.x) - lng) < 0.0003,
        ) ??
        null
      if (!hit) {
        resolve(null)
        return
      }
      resolve({
        name: String(hit.place_name ?? '').trim(),
        road: String(hit.road_address_name ?? '').trim(),
        jibun: String(hit.address_name ?? '').trim(),
      })
    }, opts)
  })
}

/** @param {Record<string, unknown>} place */
export async function enrichDriverModalPlace(place) {
  const name = String(place?.koName || place?.name || place?.placeName || place?.enName || '').trim()
  let road = String(place?.roadAddress ?? '').trim()
  let jibun = String(place?.jibunAddress ?? '').trim()
  const address = String(place?.address ?? '').trim()
  if (!road && address && address !== 'Address unavailable') {
    road = address
  }

  const saved = String(place?.koAddress ?? '').trim()
  if (!hasDriverStreetAddress(road) && !hasDriverStreetAddress(jibun) && saved && hasDriverStreetAddress(saved)) {
    const savedLines = saved
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const addressLines = savedLines.filter((line) => line !== name && hasDriverStreetAddress(line))
    if (addressLines.length > 0) {
      road = addressLines[0]
      if (addressLines[1] && !jibun) {
        jibun = addressLines[1]
      }
    } else if (hasDriverStreetAddress(saved) && saved !== name) {
      road = saved
    }
  }

  const lat = Number(place?.lat)
  const lng = Number(place?.lng)
  const kakaoId = resolveKakaoPlaceId(place)

  if (!hasDriverStreetAddress(road) && !hasDriverStreetAddress(jibun)) {
    const hit = await fetchKakaoPlaceById(kakaoId, name, lat, lng)
    if (hit) {
      road = hit.road || road
      jibun = hit.jibun || jibun
    }
  }

  if (!hasDriverStreetAddress(road) && !hasDriverStreetAddress(jibun)) {
    const coords = await fetchAddressByCoords(lat, lng)
    road = coords.road || road
    jibun = coords.jibun || jibun
  }

  const koAddress = formatDriverKoLines({ name, road, jibun })
  return {
    ...place,
    roadAddress: road,
    jibunAddress: jibun,
    koAddress,
  }
}
