import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CustomOverlayMap,
  Map as KakaoMap,
  MapMarker,
  Polyline,
  useKakaoLoader,
} from 'react-kakao-maps-sdk'
import './App.css'
import { AdminLoginModal } from './components/AdminLoginModal.jsx'
import { AdminPanel } from './components/AdminPanel.jsx'
import { PlaceDetailCard } from './components/PlaceDetailCard.jsx'
import {
  CONVENIENCE_PLACES,
  REGION_COORDS,
  THEME_BADGE,
  THEME_DEFAULT_IMAGE,
} from './data/places'
import {
  buildAreaSearchHint,
  matchAreaQuery,
  resolveAreaMapLevel,
  searchCuratedPlaces,
} from './utils/areaSearch'
import { getPinColor } from './data/pinDesigns'
import { ModeTabBar } from './components/ModeTabBar.jsx'
import { MODE_TAB_COPY } from './data/modeTabCopy'
import { AppMoreMenu } from './components/AppMoreMenu.jsx'
import { CollectionPickModal } from './components/CollectionPickModal.jsx'
import { LiveNearbyBar } from './components/LiveNearbyBar.jsx'
import { ContentStatusBanner } from './components/ContentStatusBanner.jsx'
import { RouteColorPin } from './components/RouteColorPin.jsx'
import { RouteClusterPicker } from './components/RouteClusterPicker.jsx'
import { TourOrderPin } from './components/TourOrderPin.jsx'
import { isAdminEnabled, isAdminLoggedIn, logoutAdmin } from './utils/adminAuth'
import {
  addAdminHiddenPlace,
  filterVisibleSearchPlaces,
  getPlaceHideKey,
  isPlaceHiddenFromSearch,
  loadAdminHiddenSearchKeys,
  loadHiddenPinsExportMap,
  mergeImportedHiddenPins,
  removeAdminHiddenPlace,
} from './utils/hiddenPlaces'
import {
  collectPartnerKeysForPlace,
  getPlacePartnerKey,
  getPartnerLookupKeys,
  getPlacePerk,
  isPlacePartner,
  loadAdminPartners,
  mergeImportedPartners,
  setPlacePartner,
  unsetPlacePartner,
} from './utils/adminPartners'
import {
  clearPlaceCuration,
  loadAdminCuration,
  resolveCuration,
  setPlaceCuration,
} from './utils/adminCuration'
import {
  addPlaceToCollection,
  clearCollectionPlaceCuration,
  clearCollectionPlaces,
  clearAllCollections,
  createCollection,
  deleteCollection,
  getPublishedCollections,
  loadCollections,
  mergeImportedCollections,
  movePlaceInCollection,
  reorderPlaceInCollection,
  removePlaceFromCollection,
  renameCollection,
  setCollectionPin,
  updateCollectionPlace,
  setCollectionStatus,
  setCollectionType,
} from './utils/adminCollections'
import { isRouteCollection } from './utils/collectionTypes'
import {
  buildRouteColorMap,
  buildSpotsColorMap,
  getRouteColorFromMap,
  getSpotsColorFromMap,
} from './utils/routeCollectionColors'
import { smoothPanMapTo } from './utils/smoothMapPan'
import {
  collectionsToCsv,
  downloadCsvFile,
} from './utils/curationCsv'
import {
  partnerExportFilename,
  partnersToCsv,
} from './utils/partnersCsv'
import {
  hiddenPinsExportFilename,
  hiddenPinsToCsv,
} from './utils/hiddenPinsCsv'
import { CurationEditModal } from './components/CurationEditModal.jsx'
import { CurationPicker } from './components/CurationPicker.jsx'
import { RouteItineraryPanel } from './components/RouteItineraryPanel.jsx'
import { isSyncEnabled, subscribeRemoteConfig } from './utils/remoteSync'
import {
  bootstrapContent,
  getContentBootstrapState,
  subscribeContentBootstrap,
} from './utils/contentBootstrap'
import { setAdminDraftMode } from './utils/contentSource'
import { resolveCuratedPlaceImage } from './utils/placeImageCatalog'
import { usePlaceImageCatalog } from './utils/usePlaceImageCatalog'
import { useMediaQuery } from './utils/useMediaQuery'
import { getFacilityPronunciation, romanizeHangulRuns } from './utils/pronunciation'
import { enrichDriverModalPlace } from './utils/kakaoDriverAddress'
import {
  buildDriverModalPlace,
  hasDriverStreetAddress,
  resolveDisplayNames,
  resolveDriverKoAddress,
} from './utils/placeDisplay'
import {
  findCollectionsForPlace,
  findCurationPlaceForSource,
  findPlaceInCollection,
} from './utils/placeCollections'
import {
  buildClusterLookupByPlaceKey,
  buildClusterRouteOptions,
} from './utils/routePinClusters'
import { getNearbyLiveSpec } from './data/nearbyLiveTypes'
import {
  fetchNearbyCategoryPlaces,
  fetchNearbyKeywordPlaces,
  mapKakaoNearbyRow,
} from './utils/nearbyPlacesSearch'

const MYEONGDONG_STATION = { lat: 37.560989, lng: 126.986325 }
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }
/** Kakao Map level 4 ≈ 100 m viewport scale at Seoul latitudes. */
const MAP_LEVEL_DEFAULT = 7
const MAP_LEVEL_50M = 3
const MAP_LEVEL_100M = 4
const FAV_STORAGE_KEY = 'kmap:favorite-place-keys'

function loadFavoriteKeys() {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

/** 내 위치 마커 — 테마 핀과 구분: 원형·정확도 링 (`public/marker-my-location.svg`) */
const MY_LOCATION_MARKER = {
  src: '/marker-my-location.svg',
  size: { width: 52, height: 52 },
  options: { offset: { x: 26, y: 26 } },
}

function distanceInKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const haversine = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine))
}

/** Live 키워드 검색: 화면 안 또는 내 위치 반경(km) 안 결과만 */
const LIVE_SEARCH_RADIUS_KM = 5
/** 지도를 이 거리 이상 옮기면 "Search this area" 표시 */
const MAP_SEARCH_STALE_KM = 0.2
const NON_COFFEE_CAFE_PATTERN =
  /(만화\s*카페|보드게임\s*카페|테마\s*카페|키즈\s*카페|스터디\s*카페|고양이\s*카페|강아지\s*카페|애견\s*카페|동물\s*카페|룸\s*카페|멀티\s*카페|dvd\s*방|만화방|board\s*game|study\s*cafe|kids?\s*cafe|cat\s*cafe|dog\s*cafe|pet\s*cafe|theme\s*cafe|comic\s*cafe)/i

function parseKakaoPlaceRow(place, index, centerPosition) {
  const lat = Number(place.y)
  const lng = Number(place.x)
  return {
    id: `search-${place.id}-${index}`,
    kakaoPlaceId: String(place.id),
    kakaoId: String(place.id),
    lat,
    lng,
    name: place.place_name,
    address: place.road_address_name || place.address_name || 'Address unavailable',
    roadAddress: place.road_address_name || '',
    jibunAddress: place.address_name || '',
    phone: place.phone || '',
    categoryName: place.category_name || '',
    distanceKm: distanceInKm(centerPosition, { lat, lng }),
  }
}

function isNearUserOrInMapBounds(place, bounds, userPosition, radiusKm) {
  if (bounds?.getSouthWest && bounds?.getNorthEast) {
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    const inBounds =
      place.lat >= sw.getLat() &&
      place.lat <= ne.getLat() &&
      place.lng >= sw.getLng() &&
      place.lng <= ne.getLng()
    if (inBounds) {
      return true
    }
  }
  if (userPosition && place.distanceKm <= radiusKm) {
    return true
  }
  return false
}

function isCoffeeCafePlace(rawPlace) {
  const text = [rawPlace?.place_name, rawPlace?.category_name].filter(Boolean).join(' ')
  return !NON_COFFEE_CAFE_PATTERN.test(String(text))
}

function App() {
  const [collections, setCollections] = useState(() => (isSyncEnabled ? [] : loadCollections()))
  const [contentBootstrap, setContentBootstrap] = useState(() => getContentBootstrapState())
  const imageCatalog = usePlaceImageCatalog()
  const [activeCategory, setActiveCategory] = useState('All')
  const [exploreDropdownAutoOpen, setExploreDropdownAutoOpen] = useState(true)
  const [selectedPlaceId, setSelectedPlaceId] = useState(null)
  const [selectedPlaceCollectionId, setSelectedPlaceCollectionId] = useState(null)
  const [mode, setMode] = useState('explore')
  const [showStore, setShowStore] = useState(false)
  const [showExchange, setShowExchange] = useState(false)
  const [driverModalPlace, setDriverModalPlace] = useState(null)
  const [driverAddressLoading, setDriverAddressLoading] = useState(false)
  const [myPlanIds, setMyPlanIds] = useState([])
  const [userPosition, setUserPosition] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const mapRef = useRef(null)
  const smoothPanCancelRef = useRef(null)
  const [regionQuery, setRegionQuery] = useState('')
  const [searchedPlace, setSearchedPlace] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  /** 실시간 모드에서 Map의 center prop과 지도 실제 중심을 맞춰 팬 후 튀는 현상을 줄임 */
  const [mapIdleCenter, setMapIdleCenter] = useState(DEFAULT_CENTER)
  const [mapLevel, setMapLevel] = useState(MAP_LEVEL_DEFAULT)
  const [liveNearbyTab, setLiveNearbyTab] = useState('FD6')
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [selectedNearbyId, setSelectedNearbyId] = useState(null)
  const [searchDetailOpen, setSearchDetailOpen] = useState(false)
  const [liveKeywordSearchActive, setLiveKeywordSearchActive] = useState(false)
  const [areaSearchActive, setAreaSearchActive] = useState(false)
  const [areaSearchHint, setAreaSearchHint] = useState(null)
  const [modeTabToast, setModeTabToast] = useState(null)
  const modeTabToastTimerRef = useRef(null)
  const [curatedSearchResults, setCuratedSearchResults] = useState([])
  const [searchAreaStale, setSearchAreaStale] = useState(false)
  const lastKeywordSearchCenterRef = useRef(null)
  const [favoriteKeys, setFavoriteKeys] = useState(loadFavoriteKeys)
  const [hiddenSearchKeys, setHiddenSearchKeys] = useState(loadAdminHiddenSearchKeys)
  const [partnerMap, setPartnerMap] = useState(loadAdminPartners)
  const [curationMap, setCurationMap] = useState(loadAdminCuration)
  const [editingCurationPlace, setEditingCurationPlace] = useState(null)
  const [selectedPremiumPlace, setSelectedPremiumPlace] = useState(null)
  const [isAdmin, setIsAdmin] = useState(isAdminLoggedIn)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [collectionPickPrompt, setCollectionPickPrompt] = useState(null)
  const [overlapClusterPick, setOverlapClusterPick] = useState(null)
  const nearbySearchSeq = useRef(0)
  const nearbyPlacesRef = useRef([])
  const suppressMapFocusRef = useRef(false)
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
    libraries: ['services'],
  })

  const moveMapToMyLocation = useCallback((level) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserPosition(nextPosition)
        setLocationError(null)
        if (mapRef.current && window.kakao?.maps) {
          if (Number.isFinite(level)) {
            setMapLevel(level)
            if (mapRef.current.setLevel) {
              mapRef.current.setLevel(level)
            }
          }
          if (mapRef.current.panTo) {
            mapRef.current.panTo(new window.kakao.maps.LatLng(nextPosition.lat, nextPosition.lng))
          }
        }
      },
      () => setLocationError('Location permission is needed for Places mode.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  // 일반 사용자: published만. 관리자: draft 포함(드롭다운·지도 미리보기).
  const visibleCollections = useMemo(
    () => (isAdmin ? collections : getPublishedCollections(collections)),
    [collections, isAdmin],
  )

  const routeColorByCollectionId = useMemo(
    () => buildRouteColorMap(visibleCollections),
    [visibleCollections],
  )

  const spotsColorByCollectionId = useMemo(
    () => buildSpotsColorMap(visibleCollections),
    [visibleCollections],
  )

  const collectionPlaces = useMemo(() => {
    const out = []
    for (const col of visibleCollections) {
      const total = col.places.length
      const route = isRouteCollection(col)
      const collectionColor = route
        ? getRouteColorFromMap(routeColorByCollectionId, col.id)
        : getSpotsColorFromMap(spotsColorByCollectionId, col.id)
      col.places.forEach((place, index) => {
        out.push({
          ...place,
          place_name: place.enName,
          category: col.title,
          image: resolveCuratedPlaceImage({ ...place, place_name: place.enName }).url,
          isPremium: place.isPremium ?? false,
          partnerPerk: place.partnerPerk ?? '',
          curation: place.curation ?? null,
          _collectionId: col.id,
          _collectionTitle: col.title,
          _collectionType: col.type,
          _pin: col.pin,
          _collectionColor: collectionColor,
          _tourOrder: route ? index + 1 : null,
          _tourTotal: route ? total : null,
        })
      })
    }
    return out
  }, [visibleCollections, routeColorByCollectionId, spotsColorByCollectionId, imageCatalog])

  const allPlaces = collectionPlaces

  const modeCollectionTitles = useMemo(() => {
    const pool = visibleCollections.filter((c) => c.places.length > 0)
    if (mode === 'explore') {
      return pool.filter((c) => !isRouteCollection(c)).map((c) => c.title)
    }
    if (mode === 'routes') {
      return pool.filter((c) => isRouteCollection(c)).map((c) => c.title)
    }
    return []
  }, [visibleCollections, mode])
  const categories = useMemo(() => ['All', ...modeCollectionTitles], [modeCollectionTitles])
  const isGuideMode = mode === 'explore' || mode === 'routes'

  const isDefaultTheme = activeCategory === 'All'
  const activeCollection = useMemo(() => {
    if (isDefaultTheme) {
      return null
    }
    return visibleCollections.find((c) => c.title === activeCategory) ?? null
  }, [activeCategory, isDefaultTheme, visibleCollections])

  const isActiveRoute =
    mode === 'routes' && Boolean(activeCollection && isRouteCollection(activeCollection))

  const showRouteItinerary = mode === 'routes' && !isDefaultTheme && isActiveRoute

  const activeCollectionRoute = useMemo(() => {
    if (!activeCollection || !isRouteCollection(activeCollection)) {
      return []
    }
    return activeCollection.places.filter(
      (place) =>
        Number.isFinite(place.lat) &&
        Number.isFinite(place.lng) &&
        !(place.lat === 0 && place.lng === 0) &&
        !isPlaceHiddenFromSearch(place, hiddenSearchKeys),
    )
  }, [activeCollection, hiddenSearchKeys])

  /** Explore(Route/Spots) · Routes 모드: 해당 타입 컬렉션 장소만 표시 */
  const planningPlaces = useMemo(() => {
    if (!isGuideMode) {
      return []
    }
    const typeFiltered = allPlaces.filter((place) =>
      mode === 'explore'
        ? !isRouteCollection({ type: place._collectionType })
        : isRouteCollection({ type: place._collectionType }),
    )
    if (isDefaultTheme) {
      return typeFiltered
    }
    return typeFiltered.filter((place) => place.category === activeCategory)
  }, [activeCategory, allPlaces, isDefaultTheme, isGuideMode, mode])

  /**
   * 제휴(파트너) 매장: 카테고리 필터·테마 해제와 무관하게 항상 노출.
   * - 큐레이션 장소 중 파트너로 판정된 곳
   * - 관리자가 추가한(큐레이션에 없는) 파트너 항목(검색/주변 장소 등)
   * 프리미엄 마커는 별도 레이어로 그리므로 일반 마커 목록에서는 제외해 중복 렌더를 막는다.
   */
  const premiumPlaces = useMemo(() => {
    const list = []
    const seen = new Set()
    const seenLocations = new Set()
    for (const place of allPlaces) {
      if (isPlacePartner(place, partnerMap, { includeDraft: true })) {
        const key = getPlacePartnerKey(place)
        seen.add(key)
        seenLocations.add(`${Number(place.lat).toFixed(4)},${Number(place.lng).toFixed(4)}`)
        const keys = getPartnerLookupKeys(place)
        let status = 'published'
        for (const k of keys) {
          const entry = partnerMap.get(k)
          if (entry && entry.enabled !== false) {
            status = entry.status || 'published'
            break
          }
        }
        list.push({
          ...place,
          isPremium: true,
          _dataPremium: Boolean(place.isPremium),
          _partnerStorageKey: key,
          _partnerStatus: status,
          partnerPerk: getPlacePerk(place, partnerMap),
        })
      }
    }
    for (const [key, entry] of partnerMap.entries()) {
      if (seen.has(key) || entry.enabled === false) {
        continue
      }
      if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) {
        continue
      }
      const locKey = `${entry.lat.toFixed(4)},${entry.lng.toFixed(4)}`
      if (seenLocations.has(locKey)) {
        continue
      }
      seenLocations.add(locKey)
      list.push({
        id: `partner-${key}`,
        _partnerStorageKey: key,
        kakaoPlaceId: key.startsWith('kakao:') ? key.slice(6) : entry.kakaoId || undefined,
        name: entry.name,
        enName: entry.name,
        koName: entry.koName || entry.name,
        koAddress: entry.koAddress || '',
        lat: entry.lat,
        lng: entry.lng,
        category: entry.category || 'Partner',
        isPremium: true,
        _dataPremium: false,
        _partnerStatus: entry.status || 'published',
        partnerPerk: entry.perk || '',
      })
    }
    return list
  }, [allPlaces, partnerMap])

  const planningNormalPlaces = useMemo(
    () => planningPlaces.filter((place) => !isPlacePartner(place, partnerMap)),
    [planningPlaces, partnerMap],
  )

  const visiblePlanningPlaces = useMemo(
    () => planningNormalPlaces.filter((place) => !isPlaceHiddenFromSearch(place, hiddenSearchKeys)),
    [planningNormalPlaces, hiddenSearchKeys],
  )

  const overlapClusterByPlaceKey = useMemo(() => {
    if (!isDefaultTheme || (mode !== 'routes' && mode !== 'explore')) {
      return new globalThis.Map()
    }
    return buildClusterLookupByPlaceKey(visiblePlanningPlaces)
  }, [mode, isDefaultTheme, visiblePlanningPlaces])
  const visibleNearbyPlaces = useMemo(
    () => nearbyPlaces.filter((place) => !isPlaceHiddenFromSearch(place, hiddenSearchKeys)),
    [nearbyPlaces, hiddenSearchKeys],
  )
  const visiblePremiumPlaces = useMemo(
    () =>
      premiumPlaces.filter((place) => {
        if (!isAdmin && place._partnerStatus === 'draft') {
          return false
        }
        return !isPlaceHiddenFromSearch(place, hiddenSearchKeys)
      }),
    [premiumPlaces, hiddenSearchKeys, isAdmin],
  )

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) {
      return null
    }
    const matches = allPlaces.filter((place) => place.id === selectedPlaceId)
    if (matches.length === 0) {
      return null
    }
    if (matches.length === 1) {
      return matches[0]
    }
    if (activeCategory !== 'All') {
      return (
        matches.find((place) => (place._collectionTitle || place.category) === activeCategory) ??
        matches[0]
      )
    }
    if (selectedPlaceCollectionId) {
      return (
        matches.find((place) => place._collectionId === selectedPlaceCollectionId) ?? matches[0]
      )
    }
    return matches[0]
  }, [selectedPlaceId, selectedPlaceCollectionId, allPlaces, activeCategory])
  const selectedNearbyPlace = useMemo(
    () => nearbyPlaces.find((place) => place.id === selectedNearbyId) ?? null,
    [nearbyPlaces, selectedNearbyId],
  )

  useEffect(() => {
    nearbyPlacesRef.current = nearbyPlaces
  }, [nearbyPlaces])
  /** 큐레이션 상세 카드(파트너 마커 클릭 우선, 그다음 테마 모드 선택) */
  const planningCardPlace = selectedPremiumPlace || (isGuideMode ? selectedPlace : null)

  const mapDisplayCenter =
    isGuideMode && selectedPlace
      ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
      : !isGuideMode && searchedPlace
        ? { lat: searchedPlace.lat, lng: searchedPlace.lng }
        : mapIdleCenter

  const myPlanPlaces = useMemo(
    () => allPlaces.filter((place) => myPlanIds.includes(place.id)),
    [allPlaces, myPlanIds],
  )

  useEffect(() => {
    if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
      setActiveCategory('All')
    }
  }, [activeCategory, categories])

  useEffect(() => {
    const showOverlapPicker =
      (mode === 'routes' || mode === 'explore') && isDefaultTheme
    if (!showOverlapPicker) {
      queueMicrotask(() => setOverlapClusterPick(null))
    }
  }, [mode, isDefaultTheme, activeCategory])

  useEffect(() => {
    if (!isGuideMode || activeCategory === 'All') {
      return
    }
    const collection = visibleCollections.find((c) => c.title === activeCategory)
    if (!collection) {
      setActiveCategory('All')
      return
    }
    if (mode === 'explore' && isRouteCollection(collection)) {
      setActiveCategory('All')
    }
    if (mode === 'routes' && !isRouteCollection(collection)) {
      setActiveCategory('All')
    }
  }, [mode, activeCategory, isGuideMode, visibleCollections])

  const panMapTo = useCallback((lat, lng, level = MAP_LEVEL_100M) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }
    if (!mapRef.current?.setCenter || !window.kakao?.maps) {
      return
    }
    smoothPanCancelRef.current?.()
    smoothPanCancelRef.current = smoothPanMapTo(mapRef.current, {
      lat,
      lng,
      level,
      duration: 750,
      kakao: window.kakao,
    })
  }, [])

  const focusPlaceOnMap = useCallback(
    (lat, lng) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return
      }
      setMapLevel(MAP_LEVEL_100M)
      panMapTo(lat, lng, MAP_LEVEL_100M)
    },
    [panMapTo],
  )

  useEffect(() => () => smoothPanCancelRef.current?.(), [])

  useEffect(
    () => () => {
      clearTimeout(modeTabToastTimerRef.current)
    },
    [],
  )

  const showModeTabToast = useCallback((tabMode) => {
    setModeTabToast(tabMode)
    clearTimeout(modeTabToastTimerRef.current)
    modeTabToastTimerRef.current = setTimeout(() => setModeTabToast(null), 2500)
  }, [])

  /** Route 컬렉션 드롭다운 선택 시 1번 핀으로 지도 이동. */
  useEffect(() => {
    if (mode !== 'routes' || isDefaultTheme) {
      return
    }
    if (!isActiveRoute || activeCollectionRoute.length === 0) {
      return
    }
    const first = activeCollectionRoute[0]
    panMapTo(first.lat, first.lng, MAP_LEVEL_100M)
    setMapLevel(MAP_LEVEL_100M)
  }, [
    mode,
    isDefaultTheme,
    activeCategory,
    isActiveRoute,
    activeCollectionRoute,
    panMapTo,
  ])

  // 원격(Supabase) 게시본을 store 의 remote 레이어로 받은 뒤 상태 새로고침.
  const refreshFromRemoteStores = useCallback(() => {
    setPartnerMap(loadAdminPartners())
    setHiddenSearchKeys(loadAdminHiddenSearchKeys())
    setCollections(loadCollections())
    setCurationMap(loadAdminCuration())
  }, [])

  useEffect(() => {
    setAdminDraftMode(isAdmin)
    refreshFromRemoteStores()
  }, [isAdmin, refreshFromRemoteStores])

  const retryContentBootstrap = useCallback(async () => {
    await bootstrapContent()
    refreshFromRemoteStores()
  }, [refreshFromRemoteStores])

  useEffect(() => {
    let unsubscribeBootstrap = () => {}
    let unsubscribeRemote = () => {}
    let cancelled = false

    unsubscribeBootstrap = subscribeContentBootstrap(setContentBootstrap)

    bootstrapContent().then(() => {
      if (cancelled) {
        return
      }
      refreshFromRemoteStores()
      if (isSyncEnabled) {
        unsubscribeRemote = subscribeRemoteConfig(refreshFromRemoteStores)
      }
    })

    return () => {
      cancelled = true
      unsubscribeBootstrap()
      unsubscribeRemote()
    }
  }, [refreshFromRemoteStores])

  useEffect(() => {
    if (!isGuideMode || !selectedPlaceId) {
      return
    }
    if (
      !planningPlaces.some(
        (place) =>
          place.id === selectedPlaceId &&
          (selectedPlaceCollectionId == null || place._collectionId === selectedPlaceCollectionId),
      )
    ) {
      queueMicrotask(() => {
        setSelectedPlaceId(null)
        setSelectedPlaceCollectionId(null)
      })
    }
  }, [mode, selectedPlaceId, selectedPlaceCollectionId, planningPlaces])

  /** Explore / Routes 장소·파트너 선택 시 약 100 m 스케일(level 4)로 이동·확대 */
  useEffect(() => {
    let target = null
    if (selectedPremiumPlace) {
      target = selectedPremiumPlace
    } else if (isGuideMode && selectedPlace) {
      target = selectedPlace
    }
    if (!target) {
      return
    }
    if (suppressMapFocusRef.current) {
      suppressMapFocusRef.current = false
      return
    }
    focusPlaceOnMap(target.lat, target.lng)
  }, [
    selectedPremiumPlace,
    isGuideMode,
    selectedPlace,
    selectedPlaceId,
    focusPlaceOnMap,
  ])

  useEffect(() => {
    if (isGuideMode) {
      queueMicrotask(() => {
        setNearbyPlaces([])
        setSelectedNearbyId(null)
      })
    }
  }, [mode, isGuideMode])

  useEffect(() => {
    if (mode !== 'places') {
      return
    }
    queueMicrotask(() => {
      setLiveNearbyTab('FD6')
      moveMapToMyLocation(MAP_LEVEL_50M)
    })
  }, [mode, moveMapToMyLocation])

  const runLiveNearbyOnMap = useCallback(
    (kakaoMap, tabIdOverride) => {
      const tabId = tabIdOverride ?? liveNearbyTab
      if (mode !== 'places' || !tabId || !kakaoMap || !window.kakao?.maps) {
        return
      }
      if (!tabIdOverride && liveKeywordSearchActive) {
        return
      }
      const spec = getNearbyLiveSpec(tabId)
      if (!spec) {
        return
      }
      const seq = ++nearbySearchSeq.current
      const ps = new window.kakao.maps.services.Places(kakaoMap)
      const isStale = () => nearbySearchSeq.current !== seq
      const filterRow =
        spec.id === 'CE7' ? (place) => isCoffeeCafePlace(place) : undefined

      const applyRows = (filteredData) => {
        if (isStale()) {
          return
        }
        const newPlaces = filteredData.map((p, i) => mapKakaoNearbyRow(p, i))
        setNearbyPlaces(newPlaces)
        setSelectedNearbyId((prevId) => {
          if (!prevId) {
            return null
          }
          const prevPlace = nearbyPlacesRef.current.find((p) => p.id === prevId)
          const kakaoId = prevPlace?.kakaoPlaceId
          if (!kakaoId) {
            return null
          }
          return newPlaces.find((p) => p.kakaoPlaceId === kakaoId)?.id ?? null
        })
      }

      const mapZoomLevel = kakaoMap.getLevel?.() ?? mapLevel

      const ctx = {
        tabId,
        tabLabel: spec.label,
        mapLevel: mapZoomLevel,
        filterRow,
        isStale,
        onComplete: (rows, stats) => {
          if (isStale()) {
            return
          }
          if (rows.length === 0) {
            console.debug('[KMap Places nearby]', {
              category: spec.label,
              tabId,
              apiAccumulated: stats?.apiAccumulated ?? 0,
              displayedMarkers: 0,
              onMapMarkers: 0,
              hiddenFiltered: 0,
            })
            setNearbyPlaces([])
            setSelectedNearbyId(null)
            return
          }
          const newPlaces = rows.map((p, i) => mapKakaoNearbyRow(p, i))
          const onMapMarkers = newPlaces.filter(
            (place) => !isPlaceHiddenFromSearch(place, hiddenSearchKeys),
          ).length
          console.debug('[KMap Places nearby]', {
            category: spec.label,
            tabId,
            apiAccumulated: stats?.apiAccumulated ?? rows.length,
            afterFinalize: rows.length,
            onMapMarkers,
            hiddenFiltered: rows.length - onMapMarkers,
          })
          applyRows(rows)
        },
      }

      if (spec.kind === 'category') {
        fetchNearbyCategoryPlaces(kakaoMap, ps, spec.code, ctx)
      } else {
        fetchNearbyKeywordPlaces(kakaoMap, ps, spec.keyword, ctx)
      }
    },
    [mode, liveNearbyTab, liveKeywordSearchActive, mapLevel, hiddenSearchKeys],
  )

  useEffect(() => {
    if (mode !== 'places' || !mapRef.current) {
      return
    }
    runLiveNearbyOnMap(mapRef.current)
  }, [mode, liveNearbyTab, runLiveNearbyOnMap])

  const handleMapIdle = (targetMap) => {
    if (!targetMap?.getBounds) {
      return
    }
    let mapCenter = null
    if (targetMap.getCenter) {
      const c = targetMap.getCenter()
      mapCenter = { lat: c.getLat(), lng: c.getLng() }
      setMapIdleCenter((prev) =>
        Math.abs(prev.lat - mapCenter.lat) < 1e-7 && Math.abs(prev.lng - mapCenter.lng) < 1e-7
          ? prev
          : mapCenter,
      )
    }
    if (targetMap.getLevel) {
      const nextLevel = targetMap.getLevel()
      setMapLevel((prev) => (prev === nextLevel ? prev : nextLevel))
    }
    if (mode === 'places' && !liveKeywordSearchActive) {
      runLiveNearbyOnMap(targetMap)
    }
    if (mode === 'places' && liveKeywordSearchActive && lastKeywordSearchCenterRef.current && mapCenter) {
      const movedKm = distanceInKm(mapCenter, lastKeywordSearchCenterRef.current)
      setSearchAreaStale(movedKm >= MAP_SEARCH_STALE_KM)
    }
  }

  const clearMapSelection = () => {
    setSelectedPlaceId(null)
    setSelectedPlaceCollectionId(null)
    setSelectedNearbyId(null)
    setSelectedPremiumPlace(null)
    setSearchDetailOpen(false)
    setOverlapClusterPick(null)
  }

  const closePlaceDetail = useCallback(() => {
    setSelectedPlaceId(null)
    setSelectedPlaceCollectionId(null)
    setSelectedNearbyId(null)
    setSelectedPremiumPlace(null)
    setSearchDetailOpen(false)
  }, [])

  /**
   * 관리자 전용 파트너 매장 On/Off 토글.
   * 켤 때는 혜택 문구를 입력받는다(비워도 됨). 끌 때는 해제.
   */
  const toggleAdminPartner = useCallback(
    (place) => {
      if (!isAdmin || !place) {
        return
      }
      const currentlyPartner = isPlacePartner(place, partnerMap, { includeDraft: true })
      if (currentlyPartner) {
        setPartnerMap(unsetPlacePartner(place))
        const offKeys = new Set(collectPartnerKeysForPlace(place, partnerMap))
        setSelectedPremiumPlace((current) => {
          if (!current) {
            return null
          }
          return collectPartnerKeysForPlace(current, partnerMap).some((k) => offKeys.has(k))
            ? null
            : current
        })
        return
      }
      const existingPerk = getPlacePerk(place, partnerMap)
      const perk = window.prompt(
        'Partner benefit to show on the card (optional).\n예: 주차 2시간 무료 · 쿠폰 발급',
        existingPerk || '',
      )
      if (perk === null) {
        return
      }
      enrichDriverModalPlace(place).then((enriched) => {
        setPartnerMap(setPlacePartner(enriched, { perk: perk.trim() }))
      })
    },
    [isAdmin, partnerMap],
  )

  const openDriverModal = useCallback(async (place) => {
    if (!place) {
      return
    }
    setDriverModalPlace(buildDriverModalPlace(place))
    setDriverAddressLoading(true)
    try {
      const enriched = await enrichDriverModalPlace(place)
      setDriverModalPlace(enriched)
    } finally {
      setDriverAddressLoading(false)
    }
  }, [])

  /** 패널에서 파트너 혜택 문구만 수정 */
  const editAdminPartnerPerk = useCallback(
    (place) => {
      if (!isAdmin || !place) {
        return
      }
      const existingPerk = getPlacePerk(place, partnerMap)
      const perk = window.prompt('Edit partner benefit text.', existingPerk || '')
      if (perk === null) {
        return
      }
      setPartnerMap(setPlacePartner(place, { perk: perk.trim() }))
    },
    [isAdmin, partnerMap],
  )

  /** 관리자: 큐레이션 가이드 편집 모달 열기 */
  const openCurationEditor = useCallback(
    (place) => {
      if (!isAdmin || !place) {
        return
      }
      setEditingCurationPlace(place)
    },
    [isAdmin],
  )

  const handleSaveCuration = useCallback(
    (payload) => {
      if (!editingCurationPlace) {
        return
      }
      const fields = payload?.curation ?? payload
      const imageUrl = payload?.imageUrl
      if (editingCurationPlace._collectionId) {
        setCollections(
          updateCollectionPlace(editingCurationPlace._collectionId, editingCurationPlace.id, {
            curation: fields,
            imageUrl,
          }),
        )
      } else {
        setCurationMap(setPlaceCuration(editingCurationPlace, fields))
      }
      setEditingCurationPlace(null)
    },
    [editingCurationPlace],
  )

  const handleClearCuration = useCallback(() => {
    if (!editingCurationPlace) {
      return
    }
    if (editingCurationPlace._collectionId) {
      setCollections(
        clearCollectionPlaceCuration(editingCurationPlace._collectionId, editingCurationPlace.id),
      )
    } else {
      setCurationMap(clearPlaceCuration(editingCurationPlace))
    }
    setEditingCurationPlace(null)
  }, [editingCurationPlace])

  // ── 관리자 큐레이션 컬렉션 관리 ─────────────────────────────────────────
  const handleCreateCollection = useCallback(
    (title, pin, type) => setCollections(createCollection(title, pin, type)),
    [],
  )
  const handleRenameCollection = useCallback(
    (id, title) => setCollections(renameCollection(id, title)),
    [],
  )
  const handleDeleteCollection = useCallback((id) => setCollections(deleteCollection(id)), [])
  const handleChangeCollectionPin = useCallback(
    (id, pin) => setCollections(setCollectionPin(id, pin)),
    [],
  )
  const handleAddCollectionPlace = useCallback(
    (id, result) => setCollections(addPlaceToCollection(id, result)),
    [],
  )
  const handleRemoveCollectionPlace = useCallback(
    (id, placeId) => setCollections(removePlaceFromCollection(id, placeId)),
    [],
  )
  const handleClearCollectionPlaces = useCallback(
    (id) => setCollections(clearCollectionPlaces(id)),
    [],
  )
  const handleClearAllCollections = useCallback(
    () => setCollections(clearAllCollections()),
    [],
  )
  const handleMoveCollectionPlace = useCallback(
    (id, placeId, dir) => setCollections(movePlaceInCollection(id, placeId, dir)),
    [],
  )
  const handleReorderCollectionPlace = useCallback(
    (id, placeId, toIndex) => setCollections(reorderPlaceInCollection(id, placeId, toIndex)),
    [],
  )
  const handleSaveCollectionGuide = useCallback((collectionId, placeId, payload) => {
    const guideFields = payload?.curation ?? payload?.guideFields ?? payload
    const imageUrl = payload?.imageUrl
    setCollections(
      updateCollectionPlace(collectionId, placeId, {
        curation: guideFields,
        imageUrl,
      }),
    )
  }, [])

  const handleSetCollectionStatus = useCallback((id, status) => {
    setCollections(setCollectionStatus(id, status))
  }, [])
  const handleSetCollectionType = useCallback((id, type) => {
    setCollections(setCollectionType(id, type))
  }, [])

  const handleImportCollectionsCsv = useCallback((imported, options = {}) => {
    if (!Array.isArray(imported) || imported.length === 0) {
      return { ok: false, errors: ['No collections to import.'] }
    }
    setCollections(mergeImportedCollections(imported, options))
    return { ok: true, count: imported.length }
  }, [])

  const handleExportCollectionsCsv = useCallback(() => {
    downloadCsvFile(collectionsToCsv(collections), `kmap-curation-${Date.now()}.csv`)
  }, [collections])

  const handleImportPartnersCsv = useCallback((imported, options = {}) => {
    if (!Array.isArray(imported) || imported.length === 0) {
      return { ok: false, errors: ['No partners to import.'] }
    }
    setPartnerMap(mergeImportedPartners(imported, options))
    return { ok: true, count: imported.length }
  }, [])

  const handleExportPartnersCsv = useCallback(() => {
    downloadCsvFile(partnersToCsv(partnerMap), partnerExportFilename())
  }, [partnerMap])

  const handleImportHiddenCsv = useCallback((imported, options = {}) => {
    if (!Array.isArray(imported) || imported.length === 0) {
      return { ok: false, errors: ['No hidden pins to import.'] }
    }
    setHiddenSearchKeys(mergeImportedHiddenPins(imported, options))
    return { ok: true, count: imported.length }
  }, [])

  const handleExportHiddenCsv = useCallback(() => {
    downloadCsvFile(hiddenPinsToCsv(loadHiddenPinsExportMap()), hiddenPinsExportFilename())
  }, [])

  const toggleFavoriteKey = useCallback((key) => {
    setFavoriteKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      try {
        localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        /* ignore quota */
      }
      return next
    })
  }, [])

  const visibleSearchResults = useMemo(
    () => filterVisibleSearchPlaces(searchResults, hiddenSearchKeys),
    [searchResults, hiddenSearchKeys],
  )

  /** 관리자: 지도 핀 숨김/표시(검색·주변·큐레이션·파트너 공통). */
  const toggleHideMapPin = useCallback(
    (place) => {
      if (!isAdmin) {
        return
      }
      const hidden = isPlaceHiddenFromSearch(place, hiddenSearchKeys)
      const next = hidden
        ? removeAdminHiddenPlace(hiddenSearchKeys, place)
        : addAdminHiddenPlace(hiddenSearchKeys, place)
      setHiddenSearchKeys(next)
      setSearchResults((results) => filterVisibleSearchPlaces(results, next))
      if (!hidden) {
        const hideKey = getPlaceHideKey(place)
        setSearchedPlace((current) =>
          current && getPlaceHideKey(current) === hideKey ? null : current,
        )
        setSearchDetailOpen(false)
        setSelectedNearbyId((id) => {
          if (!id) {
            return id
          }
          const nearby = nearbyPlaces.find((p) => p.id === id)
          return nearby && getPlaceHideKey(nearby) === hideKey ? null : id
        })
        setSelectedPlaceId((id) => {
          if (!id) {
            return id
          }
          const curated = allPlaces.find((p) => p.id === id)
          return curated && getPlaceHideKey(curated) === hideKey ? null : id
        })
        setSelectedPremiumPlace((current) =>
          current && getPlaceHideKey(current) === hideKey ? null : current,
        )
      }
    },
    [allPlaces, hiddenSearchKeys, isAdmin, nearbyPlaces],
  )

  const handleLoginClick = () => {
    if (isAdmin) {
      setShowAdminPanel(true)
      return
    }
    if (!isAdminEnabled()) {
      window.alert('Admin is not configured. Add VITE_ADMIN_PASSWORD to .env and restart the dev server.')
      return
    }
    setShowAdminLogin(true)
  }

  const getMapCenterPosition = () => {
    if (!mapRef.current?.getCenter) {
      return DEFAULT_CENTER
    }
    const mapCenter = mapRef.current.getCenter()
    return { lat: mapCenter.getLat(), lng: mapCenter.getLng() }
  }

  const selectPlanningPlace = useCallback((place) => {
    setSelectedPlaceId(place.id)
    setSelectedPlaceCollectionId(place._collectionId ?? null)
    setSelectedNearbyId(null)
    setSelectedPremiumPlace(null)
    setSearchDetailOpen(false)
  }, [])

  const activateCollectionForPlace = useCallback(
    (place, collectionTitle) => {
      if (collectionTitle) {
        setActiveCategory(collectionTitle)
      }
      selectPlanningPlace(place)
    },
    [selectPlanningPlace],
  )

  const handleSelectPlace = (place) => {
    selectPlanningPlace(place)
  }

  const handleAllCollectionsPinClick = useCallback(
    (place, variant) => {
      const clusterInfo = overlapClusterByPlaceKey.get(`${place._collectionId}-${place.id}`)
      const collectionOptions =
        clusterInfo?.collectionOptions ?? buildClusterRouteOptions([place])
      if (collectionOptions.length > 1) {
        setOverlapClusterPick({
          lat: clusterInfo?.lat ?? Number(place.lat),
          lng: clusterInfo?.lng ?? Number(place.lng),
          options: collectionOptions,
          variant,
        })
        return
      }
      selectPlanningPlace(place)
    },
    [overlapClusterByPlaceKey, selectPlanningPlace],
  )

  const handleOverlapClusterSelect = useCallback(
    (collectionOption) => {
      if (!collectionOption?.place) {
        setOverlapClusterPick(null)
        return
      }
      suppressMapFocusRef.current = true
      activateCollectionForPlace(collectionOption.place, collectionOption.title)
      setOverlapClusterPick(null)
    },
    [activateCollectionForPlace],
  )

  const handleCollectionPick = (collectionTitle) => {
    if (!collectionPickPrompt?.place) {
      setCollectionPickPrompt(null)
      return
    }
    const resolved =
      findPlaceInCollection(collectionPickPrompt.place.id, collectionTitle, allPlaces) ??
      collectionPickPrompt.place
    activateCollectionForPlace(resolved, activeCategory === 'All' ? null : collectionTitle)
    setCollectionPickPrompt(null)
  }

  const handleSelectNearby = (place) => {
    setSelectedPlaceId(null)
    setSelectedPremiumPlace(null)
    setSearchDetailOpen(false)
    setSelectedNearbyId(place.id)
  }

  /** 제휴 매장 마커 클릭: 어떤 모드에서도 큐레이션 상세 카드를 띄운다. */
  const handleSelectPremium = (place) => {
    setSelectedNearbyId(null)
    setSearchedPlace(null)
    setSearchDetailOpen(false)
    setSelectedPlaceId(null)
    setSelectedPremiumPlace(place)
  }

  const clearLiveKeywordSearch = useCallback(() => {
    setLiveKeywordSearchActive(false)
    setAreaSearchActive(false)
    setAreaSearchHint(null)
    setCuratedSearchResults([])
    setSearchAreaStale(false)
    lastKeywordSearchCenterRef.current = null
    setSearchResults([])
    setSearchedPlace(null)
    setSearchDetailOpen(false)
  }, [])

  const applyAreaSearch = useCallback(
    (match) => {
      const { key, area } = match
      setLiveKeywordSearchActive(false)
      setSearchAreaStale(false)
      setSearchResults([])
      setSearchedPlace(null)
      setSearchDetailOpen(false)
      setCuratedSearchResults([])
      setSelectedNearbyId(null)
      lastKeywordSearchCenterRef.current = null

      const zoomLevel = resolveAreaMapLevel(area, mode)
      setMapLevel(zoomLevel)
      panMapTo(area.lat, area.lng, zoomLevel)
      setAreaSearchHint(buildAreaSearchHint(key, mode))
      setAreaSearchActive(true)

      if (mode === 'places') {
        setNearbyPlaces([])
      }
    },
    [mode, panMapTo],
  )

  const applyCuratedSearch = useCallback(
    (matches) => {
      setAreaSearchHint(null)
      setAreaSearchActive(false)
      setLiveKeywordSearchActive(false)
      setSearchAreaStale(false)
      setSearchResults([])
      setSearchedPlace(null)
      setSearchDetailOpen(false)
      setSelectedNearbyId(null)
      setCuratedSearchResults(matches)
      lastKeywordSearchCenterRef.current = null

      const first = matches[0]
      selectPlanningPlace(first)
      focusPlaceOnMap(first.lat, first.lng)
    },
    [focusPlaceOnMap, selectPlanningPlace],
  )

  const applyLiveKeywordSearchResults = useCallback(
    (filtered, centerPosition) => {
      if (filtered.length === 0) {
        setLiveKeywordSearchActive(true)
        setSearchResults([])
        setSearchedPlace(null)
        setSearchDetailOpen(false)
        window.alert('No results in this map area or near your location.')
        return
      }
      const first = filtered[0]
      setLiveKeywordSearchActive(true)
      setSearchResults(filtered)
      setSearchedPlace({
        id: first.id,
        lat: first.lat,
        lng: first.lng,
        name: first.name,
        address: first.address,
        phone: first.phone,
        categoryName: first.categoryName || '',
        roadAddress: first.roadAddress || '',
        jibunAddress: first.jibunAddress || '',
      })
      setSearchDetailOpen(false)
      lastKeywordSearchCenterRef.current = centerPosition
      setSearchAreaStale(false)
    },
    [],
  )

  const runLiveKeywordSearch = useCallback(
    (query) => {
      const trimmed = String(query ?? '').trim()
      if (!trimmed || !mapRef.current || !window.kakao?.maps) {
        return
      }
      const kakaoMap = mapRef.current
      setAreaSearchHint(null)
      setAreaSearchActive(false)
      setCuratedSearchResults([])
      setNearbyPlaces([])
      setSelectedPlaceId(null)
      setSelectedNearbyId(null)

      const centerPosition = getMapCenterPosition()
      const ps = new window.kakao.maps.services.Places(kakaoMap)
      ps.keywordSearch(
        trimmed,
        (data, status) => {
          if (status === window.kakao.maps.services.Status.OK && Array.isArray(data) && data.length > 0) {
            const bounds = kakaoMap.getBounds?.()
            const filtered = filterVisibleSearchPlaces(
              data
                .map((place, index) => parseKakaoPlaceRow(place, index, centerPosition))
                .filter((place) =>
                  isNearUserOrInMapBounds(place, bounds, userPosition, LIVE_SEARCH_RADIUS_KM),
                )
                .sort((a, b) => a.distanceKm - b.distanceKm),
              hiddenSearchKeys,
            )
            applyLiveKeywordSearchResults(filtered, centerPosition)
            return
          }
          setLiveKeywordSearchActive(true)
          setSearchResults([])
          setSearchedPlace(null)
          setSearchDetailOpen(false)
          lastKeywordSearchCenterRef.current = centerPosition
          setSearchAreaStale(false)
          window.alert('No places found for this search.')
        },
        { useMapBounds: true },
      )
    },
    [applyLiveKeywordSearchResults, hiddenSearchKeys, userPosition],
  )

  const runExploreKakaoSearch = useCallback(
    (query) => {
      if (!mapRef.current || !window.kakao?.maps) {
        return
      }
      const kakaoMap = mapRef.current
      const placesService = new window.kakao.maps.services.Places()
      placesService.keywordSearch(query, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
          const centerPosition = getMapCenterPosition()
          const parsedResults = filterVisibleSearchPlaces(
            data
              .map((place, index) => parseKakaoPlaceRow(place, index, centerPosition))
              .sort((a, b) => a.distanceKm - b.distanceKm),
            hiddenSearchKeys,
          )
          if (parsedResults.length === 0) {
            setSearchResults([])
            setSearchedPlace(null)
            setSearchDetailOpen(false)
            window.alert('No visible places (some may be hidden from search).')
            return
          }
          const first = parsedResults[0]
          setAreaSearchHint(null)
          setAreaSearchActive(false)
          setCuratedSearchResults([])
          setLiveKeywordSearchActive(true)
          setSearchResults(parsedResults)
          setSearchedPlace({
            id: first.id,
            lat: first.lat,
            lng: first.lng,
            name: first.name,
            address: first.address,
            phone: first.phone,
            categoryName: first.categoryName || '',
            roadAddress: first.roadAddress || '',
            jibunAddress: first.jibunAddress || '',
          })
          setSearchDetailOpen(false)
          setSelectedPlaceId(null)
          setSelectedNearbyId(null)
          setMapLevel(MAP_LEVEL_100M)
          focusPlaceOnMap(first.lat, first.lng)
          return
        }

        const matchKey = Object.keys(REGION_COORDS).find((key) =>
          key.toLowerCase().includes(query.toLowerCase()),
        )
        if (!matchKey) {
          window.alert('No places found for this search.')
          return
        }
        const target = REGION_COORDS[matchKey]
        setSearchResults([])
        setSearchedPlace(null)
        setSearchDetailOpen(false)
        setCuratedSearchResults([])
        setAreaSearchHint(`Moved to ${matchKey}.`)
        setAreaSearchActive(false)
        setSelectedPlaceId(null)
        setSelectedNearbyId(null)
        setMapLevel(target.level)
        panMapTo(target.lat, target.lng, target.level)
      })
    },
    [focusPlaceOnMap, hiddenSearchKeys, panMapTo],
  )

  const dismissExploreAutoOpen = useCallback(() => {
    setExploreDropdownAutoOpen(false)
  }, [])

  const handleExploreModeClick = () => {
    setSelectedNearbyId(null)
    setSearchDetailOpen(false)
    clearLiveKeywordSearch()
    setNearbyPlaces([])
    setSelectedPlaceId(null)
    if (mode === 'explore') {
      return
    }
    setActiveCategory('All')
    setMode('explore')
  }

  const handleRoutesModeClick = () => {
    setSelectedNearbyId(null)
    setSearchDetailOpen(false)
    clearLiveKeywordSearch()
    setNearbyPlaces([])
    setSelectedPlaceId(null)
    if (mode === 'routes') {
      return
    }
    setActiveCategory('All')
    setMode('routes')
  }

  const handlePlacesModeClick = () => {
    setSelectedPlaceId(null)
    setSelectedNearbyId(null)
    setSearchDetailOpen(false)
    clearLiveKeywordSearch()
    if (mode === 'places') {
      moveMapToMyLocation(MAP_LEVEL_50M)
      return
    }
    setMode('places')
  }

  const navigateToFeaturedCollection = useCallback(
    (collectionTitle, sourcePlace) => {
      const collection = visibleCollections.find((c) => c.title === collectionTitle)
      setMode(isRouteCollection(collection) ? 'routes' : 'explore')
      setActiveCategory(collectionTitle)
      setSelectedNearbyId(null)
      setSearchedPlace(null)
      setSearchDetailOpen(false)
      clearLiveKeywordSearch()
      setNearbyPlaces([])

      const resolved = sourcePlace
        ? findCurationPlaceForSource(sourcePlace, collectionTitle, allPlaces)
        : null
      setSelectedPlaceId(resolved?.id ?? null)
      setSelectedPlaceCollectionId(resolved?._collectionId ?? null)
      setSelectedPremiumPlace(null)
    },
    [allPlaces, clearLiveKeywordSearch, visibleCollections],
  )

  const getFeaturedCollections = useCallback(
    (place) => findCollectionsForPlace(place, allPlaces),
    [allPlaces],
  )

  const focusMyPlan = () => {
    if (myPlanPlaces.length === 0) {
      window.alert('My Plan is empty. Open a place card and tap Save to add.')
      return
    }
    const first = myPlanPlaces[0]
    setMode(isRouteCollection({ type: first._collectionType }) ? 'routes' : 'explore')
    handleSelectPlace(first)
  }

  const toggleMyPlan = useCallback((placeId) => {
    setMyPlanIds((prev) => (prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]))
  }, [])

  const setDebugLocationToMyeongdong = () => {
    setUserPosition(MYEONGDONG_STATION)
    setLocationError(null)
    setSelectedPlaceId(null)
    setSelectedNearbyId(null)
    setSearchDetailOpen(false)
    if (mapRef.current?.panTo && window.kakao?.maps) {
      mapRef.current.panTo(
        new window.kakao.maps.LatLng(MYEONGDONG_STATION.lat, MYEONGDONG_STATION.lng),
      )
    }
  }

  const handleRegionSearch = (event) => {
    event.preventDefault()
    const query = regionQuery.trim()
    if (!query || !mapRef.current || !window.kakao?.maps) {
      return
    }

    setAreaSearchHint(null)
    setAreaSearchActive(false)
    setCuratedSearchResults([])

    const areaMatch = matchAreaQuery(query)
    if (areaMatch) {
      applyAreaSearch(areaMatch)
      return
    }

    const curatedMatches = searchCuratedPlaces(query, allPlaces, hiddenSearchKeys)
    if (curatedMatches.length > 0) {
      applyCuratedSearch(curatedMatches)
      return
    }

    if (mode === 'places') {
      runLiveKeywordSearch(query)
      return
    }

    runExploreKakaoSearch(query)
  }

  const nearbyStores =
    isGuideMode && showStore
      ? CONVENIENCE_PLACES.store.filter((place) => distanceInKm(mapIdleCenter, place) <= 5)
      : []
  const nearbyExchanges =
    isGuideMode && showExchange
      ? CONVENIENCE_PLACES.exchange.filter((place) => distanceInKm(mapIdleCenter, place) <= 5)
      : []
  const formatDistance = (distanceKm) => (distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`)

  const isMobileLayout = useMediaQuery('(max-width: 768px)')
  const modeTabToastHint =
    modeTabToast && MODE_TAB_COPY[modeTabToast] ? (
      <p className="mode-tab-toast-hint" role="status" aria-live="polite">
        {MODE_TAB_COPY[modeTabToast].toastMessage}
      </p>
    ) : null

  const showEmptyPublishedCollections = useMemo(() => {
    if (!contentBootstrap.syncEnabled || contentBootstrap.status !== 'ready') {
      return false
    }
    return visibleCollections.filter((c) => c.places.length > 0).length === 0
  }, [contentBootstrap, visibleCollections])

  if (loading) return <main className="status">Loading map…</main>
  if (error) return <main className="status error">Could not load Kakao Maps. Check your API key.</main>

  return (
    <main className="map-app">
      <ContentStatusBanner
        bootstrap={contentBootstrap}
        emptyCollections={showEmptyPublishedCollections}
        onRetry={retryContentBootstrap}
      />
      <KakaoMap
        center={{ lat: mapDisplayCenter.lat, lng: mapDisplayCenter.lng }}
        style={{ width: '100vw', height: '100vh' }}
        level={mapLevel}
        isPanto
        onCreate={(target) => {
          mapRef.current = target
        }}
        onIdle={handleMapIdle}
        onClick={clearMapSelection}
      >
          {mode === 'routes' && !isDefaultTheme && isActiveRoute && activeCollectionRoute.length > 1 && (
            <Polyline
              path={activeCollectionRoute.map((place) => ({ lat: place.lat, lng: place.lng }))}
              strokeWeight={4}
              strokeColor={getPinColor(activeCollection?.pin)}
              strokeOpacity={0.85}
              strokeStyle="dash"
            />
          )}

          {mode === 'places' &&
            !liveKeywordSearchActive &&
            visibleNearbyPlaces.map((place) => (
              <MapMarker
                key={place.id}
                position={{ lat: place.lat, lng: place.lng }}
                onClick={() => handleSelectNearby(place)}
              />
            ))}
          {mode === 'explore' &&
            isDefaultTheme &&
            visiblePlanningPlaces.map((place) => (
              <CustomOverlayMap
                key={`${place._collectionId}-${place.id}`}
                position={{ lat: place.lat, lng: place.lng }}
                xAnchor={0.5}
                yAnchor={1}
                zIndex={5}
                clickable
              >
                <RouteColorPin
                  color={place._collectionColor}
                  label={`${place._collectionTitle}: ${place.enName || place.koName || place.name}`}
                  selected={
                    selectedPlaceId === place.id &&
                    (activeCategory !== 'All' ||
                      selectedPlaceCollectionId === place._collectionId)
                  }
                  onClick={() => handleAllCollectionsPinClick(place, 'spot')}
                />
              </CustomOverlayMap>
            ))}
          {mode === 'explore' &&
            !isDefaultTheme &&
            visiblePlanningPlaces.map((place) => (
              <CustomOverlayMap
                key={`${place._collectionId}-${place.id}`}
                position={{ lat: place.lat, lng: place.lng }}
                xAnchor={0.5}
                yAnchor={1}
                zIndex={5}
                clickable
              >
                <RouteColorPin
                  color={place._collectionColor}
                  label={`${place._collectionTitle}: ${place.enName || place.koName || place.name}`}
                  selected={selectedPlaceId === place.id}
                  onClick={() => handleSelectPlace(place)}
                />
              </CustomOverlayMap>
            ))}
          {mode === 'routes' &&
            isDefaultTheme &&
            visiblePlanningPlaces.map((place) => (
              <CustomOverlayMap
                key={`${place._collectionId}-${place.id}`}
                position={{ lat: place.lat, lng: place.lng }}
                xAnchor={0.5}
                yAnchor={1}
                zIndex={5}
                clickable
              >
                <RouteColorPin
                  color={place._collectionColor}
                  label={`${place._collectionTitle}: ${place.enName || place.koName || place.name}`}
                  selected={
                    selectedPlaceId === place.id &&
                    (activeCategory !== 'All' ||
                      selectedPlaceCollectionId === place._collectionId)
                  }
                  onClick={() => handleAllCollectionsPinClick(place, 'route')}
                />
              </CustomOverlayMap>
            ))}
          {(mode === 'routes' || mode === 'explore') &&
            isDefaultTheme &&
            overlapClusterPick &&
            !isMobileLayout && (
              <CustomOverlayMap
                position={{ lat: overlapClusterPick.lat, lng: overlapClusterPick.lng }}
                xAnchor={0.5}
                yAnchor={1.15}
                zIndex={30}
                clickable
              >
                <RouteClusterPicker
                  routes={overlapClusterPick.options}
                  variant={overlapClusterPick.variant}
                  isMobile={false}
                  onSelect={handleOverlapClusterSelect}
                  onClose={() => setOverlapClusterPick(null)}
                />
              </CustomOverlayMap>
            )}
          {mode === 'routes' &&
            !isDefaultTheme &&
            isActiveRoute &&
            visiblePlanningPlaces.map((place) => (
              <CustomOverlayMap
                key={place.id}
                position={{ lat: place.lat, lng: place.lng }}
                xAnchor={0.5}
                yAnchor={1}
                zIndex={10 + (place._tourOrder ?? 0)}
                clickable
              >
                <TourOrderPin
                  order={place._tourOrder ?? 0}
                  pinId={place._pin}
                  label={place.enName || place.koName || place.name}
                  selected={selectedPlaceId === place.id}
                  onClick={() => handleSelectPlace(place)}
                />
            </CustomOverlayMap>
            ))}

          {/* 제휴(파트너) 매장: 숨김 목록 제외, 필터/모드와 무관하게 노출. 최상단(zIndex) + 황금 펄스. */}
          {visiblePremiumPlaces.map((place) => (
              <CustomOverlayMap
                key={`premium-${place.id}`}
                position={{ lat: place.lat, lng: place.lng }}
                xAnchor={0.5}
                yAnchor={1}
                zIndex={50}
                clickable
              >
                <button
                  type="button"
                  className="premium-pin"
                  onClick={() => handleSelectPremium(place)}
                  title={`${place.enName || place.koName || 'Partner store'} · Partner`}
                  aria-label={`${place.enName || place.koName || 'Partner store'}, partner store`}
                >
                  <span className="premium-pin-badge">Partner</span>
                  <span className="premium-pin-marker" aria-hidden>
                    ★
                  </span>
                </button>
              </CustomOverlayMap>
            ))}

          {mode === 'places' && userPosition && (
            <>
              <MapMarker
                position={{ lat: userPosition.lat, lng: userPosition.lng }}
                image={MY_LOCATION_MARKER}
                zIndex={3}
              />
              <CustomOverlayMap
                position={{ lat: userPosition.lat, lng: userPosition.lng }}
                xAnchor={0.5}
                yAnchor={1}
                zIndex={4}
                clickable={false}
              >
                <span className="my-location-label">You are here</span>
              </CustomOverlayMap>
            </>
          )}

          {searchedPlace && !isPlaceHiddenFromSearch(searchedPlace, hiddenSearchKeys) && (
            <MapMarker
              key={searchedPlace.id}
              position={{ lat: searchedPlace.lat, lng: searchedPlace.lng }}
              onClick={() => {
                setSelectedPlaceId(null)
                setSelectedNearbyId(null)
                setSearchDetailOpen(true)
              }}
            />
          )}

          {visibleSearchResults.map((place) => (
            <MapMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              onClick={() => {
                setSelectedNearbyId(null)
                setSelectedPlaceId(null)
                setSearchedPlace(place)
                setSearchDetailOpen(true)
              }}
            />
          ))}

          {nearbyStores.map((place) => (
            <MapMarker key={place.id} position={{ lat: place.lat, lng: place.lng }}>
              <div className="mini-icon store" title={place.name}>🏪</div>
            </MapMarker>
          ))}
          {nearbyExchanges.map((place) => (
            <MapMarker key={place.id} position={{ lat: place.lat, lng: place.lng }}>
              <div className="mini-icon exchange" title={place.name}>💱</div>
            </MapMarker>
          ))}
      </KakaoMap>

      <section className="overlay top-left">
        <div className="top-left-search-col">
          <form className="simple-search" onSubmit={handleRegionSearch}>
            <input
              type="text"
              value={regionQuery}
              onChange={(event) => setRegionQuery(event.target.value)}
              placeholder="Search area or place..."
            />
            <button type="submit" className="simple-btn">Search</button>
          </form>
          {!isMobileLayout ? modeTabToastHint : null}
          {mode === 'places' && (liveKeywordSearchActive || areaSearchActive) && regionQuery.trim() ? (
            <button
              type="button"
              className={
                searchAreaStale
                  ? 'simple-btn search-this-area-btn active'
                  : 'simple-btn search-this-area-btn'
              }
              onClick={() => runLiveKeywordSearch(regionQuery.trim())}
              title="Search for places in the map area you are viewing"
            >
              Search this area
            </button>
          ) : null}
          {areaSearchHint ? (
            <p className="area-search-hint" role="status">
              {areaSearchHint}
            </p>
          ) : null}
          {showRouteItinerary && activeCollection ? (
            <RouteItineraryPanel
              collection={activeCollection}
              stops={visiblePlanningPlaces}
              selectedPlaceId={selectedPlaceId}
              routeColor={getRouteColorFromMap(routeColorByCollectionId, activeCollection.id)}
              curationMap={curationMap}
              onSelectStop={handleSelectPlace}
            />
          ) : null}
        </div>
      </section>

      <section className="overlay top-right">
        <ModeTabBar
          mode={mode}
          onSpotsClick={handleExploreModeClick}
          onRoutesClick={handleRoutesModeClick}
          onPlacesClick={handlePlacesModeClick}
          onTabToast={showModeTabToast}
        >
          <AppMoreMenu
            isAdmin={isAdmin}
            adminEnabled={isAdminEnabled()}
            onLogin={handleLoginClick}
            onLogout={() => {
              logoutAdmin()
              setIsAdmin(false)
              setShowAdminPanel(false)
            }}
          />
        </ModeTabBar>
        {mode === 'explore' ? (
          <CurationPicker
            collections={visibleCollections}
            spotsColorByCollectionId={spotsColorByCollectionId}
            activeCategory={activeCategory}
            isAdmin={isAdmin}
            filterType="spots"
            allLabel="All Spots"
            allHint="View all collections at once"
            showExploreHeader
            exploreHeaderTitle="Explore Seoul"
            promptSelect={mode === 'explore' && exploreDropdownAutoOpen}
            onIntroDismissed={dismissExploreAutoOpen}
            onSelect={(category) => {
              setActiveCategory(category)
              setSelectedPlaceId(null)
              setSelectedPlaceCollectionId(null)
              setSearchDetailOpen(false)
            }}
          />
        ) : null}
        {mode === 'routes' ? (
          <CurationPicker
            collections={visibleCollections}
            routeColorByCollectionId={routeColorByCollectionId}
            activeCategory={activeCategory}
            isAdmin={isAdmin}
            filterType="routes"
            allLabel="All Routes"
            allHint="Show every route"
            onSelect={(category) => {
              setActiveCategory(category)
              setSelectedPlaceId(null)
              setSelectedPlaceCollectionId(null)
              setSearchDetailOpen(false)
            }}
          />
        ) : null}
        {isMobileLayout ? modeTabToastHint : null}
      </section>

      {locationError ? (
        <section
          className={`overlay location-toast${mode === 'places' ? ' location-toast--places' : ' location-toast--guide'}`}
          role="status"
          aria-live="polite"
        >
          <p className="location-error">{locationError}</p>
        </section>
      ) : null}

      {mode === 'places' && (
        <section className="overlay live-nearby-bar">
          <LiveNearbyBar
            activeTab={liveNearbyTab}
            onSelectTab={(tabId) => {
              clearLiveKeywordSearch()
              setRegionQuery('')
              setNearbyPlaces([])
              setSelectedNearbyId(null)
              setLiveNearbyTab(tabId)
              if (mapRef.current) {
                runLiveNearbyOnMap(mapRef.current, tabId)
              }
            }}
          />
        </section>
      )}

      <section className="overlay bottom-right action-stack">
        <button type="button" className="simple-btn" onClick={focusMyPlan}>
          My Plan ({myPlanPlaces.length})
        </button>
        {isGuideMode && (
          <>
            <button
              type="button"
              className={showStore ? 'simple-btn active' : 'simple-btn'}
              onClick={() => {
                setShowStore((prev) => !prev)
                clearMapSelection()
              }}
            >
              Store
            </button>
            <button
              type="button"
              className={showExchange ? 'simple-btn active' : 'simple-btn'}
              onClick={() => {
                setShowExchange((prev) => !prev)
                clearMapSelection()
              }}
            >
              Exchange
            </button>
          </>
        )}
      </section>

      <section className="overlay bottom-left">
        <div className="mode-indicator">
          {mode === 'explore'
            ? `Spots · ${activeCategory === 'All' ? 'All Spots' : activeCategory}`
            : mode === 'routes'
              ? `Routes · ${activeCategory === 'All' ? 'All Routes' : activeCategory}`
              : liveKeywordSearchActive && regionQuery.trim()
                ? `Places · Search · ${regionQuery.trim()}`
                : areaSearchActive && regionQuery.trim()
                  ? `Places · ${regionQuery.trim()}`
                  : 'Places'}
        </div>
        {areaSearchHint && mode !== 'places' ? (
          <p className="area-search-hint area-search-hint--bottom" role="status">
            {areaSearchHint}
          </p>
        ) : null}
        {mode === 'places' && (
          <button type="button" className="simple-btn debug-btn" onClick={setDebugLocationToMyeongdong}>
            Debug Location
          </button>
        )}
        {curatedSearchResults.length > 1 ? (
          <section className="search-results-panel">
            <h3>{regionQuery.trim()} · KMap spots</h3>
            <div className="search-results-list">
              {curatedSearchResults.map((place) => {
                const displayName = place.enName || place.place_name || place.koName || 'Place'
                const collectionTitle = place._collectionTitle || place.category || ''
                return (
                  <button
                    key={`curated-${place.id}-${place._collectionId ?? 'x'}`}
                    type="button"
                    className={
                      selectedPlaceId === place.id &&
                      (selectedPlaceCollectionId ?? null) === (place._collectionId ?? null)
                        ? 'search-result-item active'
                        : 'search-result-item'
                    }
                    onClick={() => {
                      handleSelectPlace(place)
                      focusPlaceOnMap(place.lat, place.lng)
                    }}
                  >
                    <span className="search-result-main">
                      <span className="search-result-name">{displayName}</span>
                      {place.koName ? <span className="search-result-ko">{place.koName}</span> : null}
                      {collectionTitle ? (
                        <span className="search-result-line">{collectionTitle}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}
        {visibleSearchResults.length > 1 && (
          <section className="search-results-panel">
            <h3>{regionQuery.trim()} results</h3>
            <div className="search-results-list">
              {visibleSearchResults.map((place) => {
                const { nameKo, nameEn, subwayLines = [], isSubway = false } = resolveDisplayNames(
                  place,
                  'search',
                )
                const displayName = nameEn || nameKo || place.name
                const pronunciation =
                  nameKo && !isSubway
                    ? getFacilityPronunciation({ ...place, name: nameKo, koName: nameKo })?.text
                    : getFacilityPronunciation(place)?.text
                return (
                <button
                  key={`result-${place.id}`}
                  type="button"
                  className={searchedPlace?.id === place.id ? 'search-result-item active' : 'search-result-item'}
                  onClick={() => {
                    setSelectedPlaceId(null)
                    setSearchedPlace(place)
                    setSelectedNearbyId(null)
                    setSearchDetailOpen(true)
                  }}
                >
                  <span className="search-result-main">
                    <span className="search-result-name">{displayName}</span>
                    {pronunciation ? <span className="search-result-rr">{pronunciation}</span> : null}
                    {nameEn && nameKo ? (
                      <span className="search-result-ko">{nameKo}</span>
                    ) : null}
                    {subwayLines.length > 0 ? (
                      <span className="search-result-line">
                        {subwayLines.map((line) => `🚇 ${line}`).join(' · ')}
                      </span>
                    ) : null}
                  </span>
                  <span className="search-result-distance">{formatDistance(place.distanceKm)}</span>
                </button>
                )
              })}
            </div>
          </section>
        )}
      </section>

      {planningCardPlace && (
        <PlaceDetailCard
          key={`planning-${planningCardPlace.id}`}
          kind="planning"
          place={planningCardPlace}
          themeDefaultImage={THEME_DEFAULT_IMAGE}
          themeBadge={THEME_BADGE}
          collectionInfo={{
            title: planningCardPlace._collectionTitle || planningCardPlace.category || '',
            type: planningCardPlace._collectionType,
            order: planningCardPlace._tourOrder ?? null,
            total: planningCardPlace._tourTotal ?? null,
          }}
          isSaved={myPlanIds.includes(planningCardPlace.id)}
          onToggleSave={() => toggleMyPlan(planningCardPlace.id)}
          onShowDriver={() => openDriverModal(planningCardPlace)}
          isAdmin={isAdmin}
          isPartner={isPlacePartner(planningCardPlace, partnerMap, { includeDraft: isAdmin })}
          onTogglePartner={() => toggleAdminPartner(planningCardPlace)}
          isHiddenFromSearch={isPlaceHiddenFromSearch(planningCardPlace, hiddenSearchKeys)}
          onToggleHideFromSearch={isAdmin ? () => toggleHideMapPin(planningCardPlace) : undefined}
          curation={resolveCuration(planningCardPlace, curationMap)}
          onEditCuration={isAdmin ? () => openCurationEditor(planningCardPlace) : undefined}
          onClose={closePlaceDetail}
        />
      )}

      {overlapClusterPick && isMobileLayout ? (
        <RouteClusterPicker
          routes={overlapClusterPick.options}
          variant={overlapClusterPick.variant}
          isMobile
          onSelect={handleOverlapClusterSelect}
          onClose={() => setOverlapClusterPick(null)}
        />
      ) : null}

      {collectionPickPrompt ? (
        <CollectionPickModal
          placeName={collectionPickPrompt.placeName}
          collections={collectionPickPrompt.collections}
          onSelect={handleCollectionPick}
          onClose={() => setCollectionPickPrompt(null)}
        />
      ) : null}

      {editingCurationPlace && isAdmin && (
        <CurationEditModal
          place={editingCurationPlace}
          initial={resolveCuration(editingCurationPlace, curationMap)}
          onSave={handleSaveCuration}
          onClear={handleClearCuration}
          onClose={() => setEditingCurationPlace(null)}
        />
      )}

      {mode === 'places' && selectedNearbyPlace && !planningCardPlace && (
        <PlaceDetailCard
          key={`nearby-${selectedNearbyPlace.id}`}
          kind="nearby"
          place={selectedNearbyPlace}
          featuredCollections={getFeaturedCollections(selectedNearbyPlace)}
          onFeaturedCollectionSelect={(title) =>
            navigateToFeaturedCollection(title, selectedNearbyPlace)
          }
          isSaved={favoriteKeys.has(`nearby:${selectedNearbyPlace.id}`)}
          onToggleSave={() => toggleFavoriteKey(`nearby:${selectedNearbyPlace.id}`)}
          isAdmin={isAdmin}
          isPartner={isPlacePartner(selectedNearbyPlace, partnerMap, { includeDraft: isAdmin })}
          onTogglePartner={() => toggleAdminPartner(selectedNearbyPlace)}
          isHiddenFromSearch={isPlaceHiddenFromSearch(selectedNearbyPlace, hiddenSearchKeys)}
          onToggleHideFromSearch={isAdmin ? () => toggleHideMapPin(selectedNearbyPlace) : undefined}
          onShowDriver={() => openDriverModal(selectedNearbyPlace)}
          onClose={closePlaceDetail}
        />
      )}

      {searchedPlace && searchDetailOpen && !isPlaceHiddenFromSearch(searchedPlace, hiddenSearchKeys) && (
        <PlaceDetailCard
          key={`search-${searchedPlace.id}`}
          kind="search"
          place={searchedPlace}
          featuredCollections={getFeaturedCollections(searchedPlace)}
          onFeaturedCollectionSelect={(title) =>
            navigateToFeaturedCollection(title, searchedPlace)
          }
          isSaved={favoriteKeys.has(`search:${searchedPlace.id}`)}
          onToggleSave={() => toggleFavoriteKey(`search:${searchedPlace.id}`)}
          isAdmin={isAdmin}
          isHiddenFromSearch={isPlaceHiddenFromSearch(searchedPlace, hiddenSearchKeys)}
          onToggleHideFromSearch={() => toggleHideMapPin(searchedPlace)}
          isPartner={isPlacePartner(searchedPlace, partnerMap, { includeDraft: isAdmin })}
          onTogglePartner={() => toggleAdminPartner(searchedPlace)}
          onShowDriver={() => openDriverModal(searchedPlace)}
          onClose={closePlaceDetail}
        />
      )}

      {showAdminLogin && (
        <AdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onSuccess={() => {
            setIsAdmin(true)
            setShowAdminLogin(false)
            setShowAdminPanel(true)
          }}
        />
      )}

      {showAdminPanel && isAdmin && (
        <AdminPanel
          hiddenKeys={hiddenSearchKeys}
          onHiddenKeysChange={setHiddenSearchKeys}
          partnerPlaces={premiumPlaces}
          partnerMap={partnerMap}
          onImportPartnersCsv={handleImportPartnersCsv}
          onExportPartnersCsv={handleExportPartnersCsv}
          onImportHiddenCsv={handleImportHiddenCsv}
          onExportHiddenCsv={handleExportHiddenCsv}
          onRemovePartner={(place) => setPartnerMap(unsetPlacePartner(place))}
          onEditPartnerPerk={editAdminPartnerPerk}
          collections={collections}
          onCreateCollection={handleCreateCollection}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          onChangeCollectionPin={handleChangeCollectionPin}
          onSetCollectionType={handleSetCollectionType}
          onAddCollectionPlace={handleAddCollectionPlace}
          onRemoveCollectionPlace={handleRemoveCollectionPlace}
          onClearCollectionPlaces={handleClearCollectionPlaces}
          onClearAllCollections={handleClearAllCollections}
          onMoveCollectionPlace={handleMoveCollectionPlace}
          onReorderCollectionPlace={handleReorderCollectionPlace}
          onSaveGuide={handleSaveCollectionGuide}
          onSetStatus={handleSetCollectionStatus}
          onImportCsv={handleImportCollectionsCsv}
          onExportCsv={handleExportCollectionsCsv}
          onClose={() => setShowAdminPanel(false)}
          onLogout={() => setIsAdmin(false)}
        />
      )}

      {driverModalPlace && (
        <div
          className="driver-modal-backdrop"
          onClick={() => {
            setDriverModalPlace(null)
            setDriverAddressLoading(false)
          }}
          role="presentation"
        >
          <section className="driver-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Show this to your driver</h2>
            <p className="driver-message-ko">여기로 가주세요!</p>
            <p className="driver-address">
              {(() => {
                const text = resolveDriverKoAddress(driverModalPlace)
                if (driverAddressLoading && !hasDriverStreetAddress(text.split('\n').slice(1).join('\n'))) {
                  return `${text}\n주소 불러오는 중…`
                }
                return text
              })()}
            </p>
            {(() => {
              const driverText = resolveDriverKoAddress(driverModalPlace)
              const head = driverText
                ?.split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 2)
                .join(' ')
              const rr = romanizeHangulRuns(head || driverText || '')
              return rr ? (
                <p className="driver-address-rr">
                  Pronunciation: <strong>{rr}</strong>
                </p>
              ) : null
            })()}
            <p className="driver-message">Please go to this address.</p>
            <button
              type="button"
              onClick={() => {
                setDriverModalPlace(null)
                setDriverAddressLoading(false)
              }}
            >
              Close
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
