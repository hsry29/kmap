const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

/**
 * 현재 지도 중심에서 목표 좌표로 부드럽게 이동한다.
 * Kakao panTo는 화면 밖 거리면 순간이동하므로 setCenter 보간으로 처리한다.
 * @returns {() => void} 진행 중인 애니메이션 취소 함수
 */
export function smoothPanMapTo(
  map,
  { lat, lng, level, duration = 700, kakao = window.kakao },
) {
  if (!map?.setCenter || !kakao?.maps) {
    return () => {}
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return () => {}
  }

  const center = map.getCenter()
  const startLat = center.getLat()
  const startLng = center.getLng()
  const startTime = performance.now()
  let frameId = 0
  let cancelled = false

  const cancel = () => {
    cancelled = true
    if (frameId) {
      cancelAnimationFrame(frameId)
    }
  }

  const step = (now) => {
    if (cancelled) {
      return
    }
    const progress = Math.min(1, (now - startTime) / duration)
    const eased = easeInOutCubic(progress)
    map.setCenter(
      new kakao.maps.LatLng(
        startLat + (lat - startLat) * eased,
        startLng + (lng - startLng) * eased,
      ),
    )
    if (progress < 1) {
      frameId = requestAnimationFrame(step)
      return
    }
    if (Number.isFinite(level)) {
      map.setLevel(level)
    }
  }

  frameId = requestAnimationFrame(step)
  return cancel
}
