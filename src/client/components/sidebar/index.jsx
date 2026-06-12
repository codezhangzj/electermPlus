import {
  BookOutlined,
  CloudSyncOutlined,
  CodeOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  PlusCircleOutlined,
  SettingOutlined,
  AppstoreOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { Popover } from 'antd'
import SideBarPanel from './sidebar-panel'
import TransferList from './transfer-list'
import MenuBtn from '../sys-menu/menu-btn'
import QuickConnect from '../tabs/quick-connect'
import {
  sidebarWidth,
  settingMap,
  modals
} from '../../common/constants'
import SideIcon from './side-icon'
import SidePanel from './side-panel'
import hasActiveInput from '../../common/has-active-input'
import './sidebar.styl'

const e = window.translate

export default function Sidebar (props) {
  const {
    height,
    settingTab,
    settingItem,
    isSyncingSetting,
    leftSidebarWidth,
    pinned,
    fileTransfers,
    openedSideBar,
    transferHistory,
    transferTab,
    showModal,
    showInfoModal,
    sidebarPanelTab,
    openWidgetsModal,
    showHomeDashboard
  } = props

  const { store } = window

  const handleClickOutside = (event) => {
    // Don't close if pinned or has active input
    if (store.pinned || hasActiveInput()) {
      return
    }

    // Check if click is outside the sidebar panel
    const sidebarPanel = document.querySelector('.sidebar-panel')
    if (sidebarPanel && !sidebarPanel.contains(event.target)) {
      store.setOpenedSideBar('')
      document.removeEventListener('click', handleClickOutside)
    }
  }

  const handleClickBookmark = () => {
    if (showModal) {
      store.showModal = 0
    }
    if (pinned) {
      return
    }
    if (openedSideBar === 'bookmarks') {
      // Remove listener when closing
      document.removeEventListener('click', handleClickOutside)
      store.setOpenedSideBar('')
    } else {
      // Add listener when opening, with slight delay to avoid conflict with this click
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
      store.setOpenedSideBar('bookmarks')
    }
  }

  const handleShowHome = () => {
    if (showModal) {
      store.showModal = 0
    }
    store.setOpenedSideBar('')
    store.showHomeDashboard = true
  }

  const handleShowTerminal = () => {
    if (showModal) {
      store.showModal = 0
    }
    store.setOpenedSideBar('')
    store.showHomeDashboard = false
    store.focus()
  }

  const {
    onNewSsh,
    openSetting,
    openAbout,
    openSettingSync,
    openTerminalThemes,
    setLeftSidePanelWidth
  } = store
  const showSetting = showModal === modals.setting
  const settingActive = showSetting && settingTab === settingMap.setting && settingItem.id === 'setting-common'
  const syncActive = showSetting && settingTab === settingMap.setting && settingItem.id === 'setting-sync'
  const themeActive = showSetting && settingTab === settingMap.terminalThemes
  const bookmarksActive = showSetting && settingTab === settingMap.bookmarks
  const widgetsActive = showSetting && settingTab === settingMap.widgets
  const sideProps = openedSideBar
    ? {
        className: 'sidebar-list',
        style: {
          width: `${leftSidebarWidth}px`
        }
      }
    : {
        className: 'sidebar-list'
      }
  const sidebarProps = {
    className: `sidebar type-${openedSideBar}`,
    style: {
      width: sidebarWidth,
      height
    }
  }
  const transferProps = {
    fileTransfers,
    transferTab,
    transferHistory
  }
  return (
    <div {...sidebarProps}>
      <div className='sidebar-bar btns'>
        <div className='control-icon-wrap'>
          <MenuBtn store={store} config={store.config} />
        </div>
        <SideIcon
          title='首页'
          active={showHomeDashboard}
        >
          <HomeOutlined
            className='font20 iblock control-icon'
            onClick={handleShowHome}
          />
        </SideIcon>
        <SideIcon
          title='终端'
          active={!showHomeDashboard && !showModal && !showInfoModal}
        >
          <CodeOutlined
            className='font20 iblock control-icon'
            onClick={handleShowTerminal}
          />
        </SideIcon>
        <SideIcon
          title={e('newBookmark')}
        >
          <PlusCircleOutlined
            className='font22 iblock control-icon'
            onClick={onNewSsh}
          />
        </SideIcon>
        <Popover
          content={<QuickConnect inputOnly />}
          trigger='click'
          placement='right'
        >
          <div className='control-icon-wrap' title={e('quickConnect')}>
            <ThunderboltOutlined
              className='font20 iblock control-icon'
            />
          </div>
        </Popover>
        <SideIcon
          title={e(settingMap.bookmarks)}
          active={bookmarksActive}
        >
          <BookOutlined
            onClick={handleClickBookmark}
            className='font20 iblock control-icon'
          />
        </SideIcon>
        <TransferList {...transferProps} />
        <SideIcon
          title={e(settingMap.terminalThemes)}
          active={themeActive}
        >
          <PictureOutlined
            className='font20 iblock pointer control-icon'
            onClick={openTerminalThemes}
          />
        </SideIcon>
        <SideIcon
          title={e(settingMap.setting)}
          active={settingActive}
        >
          <SettingOutlined className='iblock font20 control-icon' onClick={openSetting} />
        </SideIcon>
        <SideIcon
          title={e('settingSync')}
          active={syncActive}
        >
          <CloudSyncOutlined
            className='iblock font20 control-icon'
            onClick={openSettingSync}
            spin={isSyncingSetting}
          />
        </SideIcon>
        <SideIcon
          title={e('widgets')}
          active={widgetsActive}
        >
          <AppstoreOutlined className='iblock font20 control-icon' onClick={openWidgetsModal} />
        </SideIcon>

        <SideIcon
          title={e('about')}
          active={showInfoModal}
        >
          <InfoCircleOutlined
            className='iblock font16 control-icon open-about-icon'
            onClick={openAbout}
          />
        </SideIcon>
      </div>
      <SidePanel
        sideProps={sideProps}
        setLeftSidePanelWidth={setLeftSidePanelWidth}
        leftSidebarWidth={leftSidebarWidth}
      >
        <SideBarPanel
          pinned={pinned}
          sidebarPanelTab={sidebarPanelTab}
        />
      </SidePanel>
    </div>
  )
}
