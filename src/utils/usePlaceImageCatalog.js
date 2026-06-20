import { useSyncExternalStore } from 'react'
import { getPlaceImageCatalog, subscribePlaceImageCatalog } from './placeImageCatalog'

export function usePlaceImageCatalog() {
  return useSyncExternalStore(
    subscribePlaceImageCatalog,
    getPlaceImageCatalog,
    getPlaceImageCatalog,
  )
}
