import { useMemo, useRef } from 'react'

import DorpDownMenu, { type DorpDownMenuProps as _DorpDownMenuProps } from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import ScriptImportExport, { type ScriptImportExportType } from './ScriptImportExport'
import ScriptImportOnline, { type ScriptImportOnlineType } from './ScriptImportOnline'
import { state } from '@/store/userApi'
import { tipDialog } from '@/utils/tools'
import { handleImportScript } from './action'

import { useTheme } from '@/store/theme/hook'

// 默认音源脚本
const defaultUserApiScript = `/*!
 * @name Huibq_lxmusic源
 * @description Github搜索"洛雪音乐音源"，禁止批量下载！
 * @version v1.2.0
 * @author Huibq
 */
const DEV_ENABLE = false
const API_URL = 'https://lxmusicapi.onrender.com'
const API_KEY = 'share-v2'
const MUSIC_QUALITY = {
  kw: ['128k', '320k'],
  kg: ['128k', '320k'],
  tx: ['128k', '320k'],
  wy: ['128k', '320k'],
  mg: ['128k', '320k'],
}
const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY)
const { EVENT_NAMES, request, on, send, utils, env, version } = globalThis.lx
const httpFetch = (url, options = { method: 'GET' }) => {
  return new Promise((resolve, reject) => {
    request(url, options, (err, resp) => {
      if (err) return reject(err)
      resolve(resp)
    })
  })
}
const handleGetMusicUrl = async (source, musicInfo, quality) => {
  const songId = musicInfo.hash ?? musicInfo.songmid

  const request = await httpFetch(\`\${API_URL}/url/\${source}/\${songId}/\${quality}\`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': \`\${env ? \`lx-music-\${env}/\${version}\` : \`lx-usic-request/\${version}\`}\`,
      'X-Request-Key': API_KEY,
    },
  })
  const { body } = request
  if (!body || isNaN(Number(body.code))) throw new Error('unknow error')
  switch (body.code) {
    case 0:
      return body.url
    case 1:
      throw new Error('block ip')
    case 2:
      throw new Error('get music url failed')
    case 4:
      throw new Error('internal server error')
    case 5:
      throw new Error('too many requests')
    case 6:
      throw new Error('param error')
    default:
      throw new Error(body.msg ?? 'unknow error')
  }
}
const musicSources = {}
MUSIC_SOURCE.forEach(item => {
  musicSources[item] = {
    name: item,
    type: 'music',
    actions: ['musicUrl'],
    qualitys: MUSIC_QUALITY[item],
  }
})
on(EVENT_NAMES.request, ({ action, source, info }) => {
  switch (action) {
    case 'musicUrl':
      if (env != 'mobile') {
        console.group(\`Handle Action(musicUrl)\`)
        console.log('source', source)
        console.log('quality', info.type)
        console.log('musicInfo', info.musicInfo)
        console.groupEnd()
      } else {
        console.log(\`Handle Action(musicUrl)\`)
        console.log('source', source)
        console.log('quality', info.type)
        console.log('musicInfo', info.musicInfo)
      }
      return handleGetMusicUrl(source, info.musicInfo, info.type)
        .then(data => Promise.resolve(data))
        .catch(err => Promise.reject(err))
    default:
      console.error(\`action(\${action}) not support\`)
      return Promise.reject('action not support')
  }
})
send(EVENT_NAMES.inited, { status: true, openDevTools: DEV_ENABLE, sources: musicSources })
`

interface BtnProps {
  btnStyle?: _DorpDownMenuProps<any[]>['btnStyle']
}


export default ({ btnStyle }: BtnProps) => {
  const t = useI18n()
  const theme = useTheme()
  const scriptImportExportRef = useRef<ScriptImportExportType>(null)
  const scriptImportOnlineRef = useRef<ScriptImportOnlineType>(null)

  const importTypes = useMemo(() => {
    return [
      { action: 'default', label: '添加默认音源' },
      { action: 'local', label: t('user_api_btn_import_local') },
      { action: 'online', label: t('user_api_btn_import_online') },
    ] as const
  }, [t])

  type DorpDownMenuProps = _DorpDownMenuProps<typeof importTypes>

  const handleAction: DorpDownMenuProps['onPress'] = ({ action }) => {
    if (state.list.length > 20) {
      void tipDialog({
        message: t('user_api_max_tip'),
        btnText: t('ok'),
      })
      return
    }

    if (action == 'local') {
      scriptImportExportRef.current?.import()
    } else if (action == 'online') {
      scriptImportOnlineRef.current?.show()
    } else if (action == 'default') {
      void handleImportScript(defaultUserApiScript)
    }
  }


  return (
    <DorpDownMenu
      btnStyle={btnStyle}
      menus={importTypes}
      center
      onPress={handleAction}
    >
      <Text size={14} color={theme['c-button-font']}>{t('user_api_btn_import')}</Text>
      <ScriptImportExport ref={scriptImportExportRef} />
      <ScriptImportOnline ref={scriptImportOnlineRef} />
    </DorpDownMenu>
  )
}
