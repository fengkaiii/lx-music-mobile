import { setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
import { LIST_IDS, MUSIC_TOGGLE_MODE } from '@/config/constant'
import { updateSetting } from '@/core/common'
import searchMusicState from '@/store/search/music/state'
import { getRandom } from '@/utils/common'
import { search } from '@/core/search/music'

/**
 * 以当前已加载的搜索结果为临时歌单播放，并静默加载更多页数据
 * @param isRandom true 随机播放（切换播放模式为随机，从随机一首开始）；false 顺序播放（切换为列表循环，从第一首开始）
 */
export const handlePlayAll = async(isRandom: boolean) => {
  const listInfo = searchMusicState.listInfos[searchMusicState.source]
  const list = listInfo?.list
  if (!list?.length) return
  
  const tempListId = `search__${searchMusicState.source}__${searchMusicState.searchText}`
  
  // 先使用第一页结果开始播放
  await setTempList(tempListId, [...list])
  updateSetting({ 'player.togglePlayMethod': isRandom ? MUSIC_TOGGLE_MODE.random : MUSIC_TOGGLE_MODE.listLoop })
  void playList(LIST_IDS.TEMP, isRandom ? getRandom(0, list.length) : 0)
  
  // 静默加载第2页和第3页数据
  void (async() => {
    try {
      const maxPage = listInfo?.maxPage ?? Infinity
      const currentPage = listInfo?.page ?? 1
      const text = searchMusicState.searchText
      const source = searchMusicState.source
      
      // 加载第2页
      if (currentPage < maxPage) {
        await search(text, currentPage + 1, source)
      }
      
      // 加载第3页
      const updatedListInfo = searchMusicState.listInfos[source]
      if (updatedListInfo && updatedListInfo.page < updatedListInfo.maxPage) {
        await search(text, updatedListInfo.page + 1, source)
      }
      
      // 更新临时播放列表
      const fullList = searchMusicState.listInfos[source]?.list
      if (fullList?.length) {
        await setTempList(tempListId, [...fullList])
      }
    } catch (error) {
      console.log('加载更多搜索结果失败:', error)
    }
  })()
}
