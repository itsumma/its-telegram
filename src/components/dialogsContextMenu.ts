/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type {Dialog} from '../lib/appManagers/appMessagesManager';
import type {ForumTopic} from '../layer';
import appDialogsManager, {DIALOG_LIST_ELEMENT_TAG} from '../lib/appManagers/appDialogsManager';
import rootScope from '../lib/rootScope';
import {ButtonMenuItemOptionsVerifiable} from './buttonMenu';
import PopupDeleteDialog from './popups/deleteDialog';
import {i18n, LangPackKey, _i18n} from '../lib/langPack';
import findUpTag from '../helpers/dom/findUpTag';
import {toastNew} from './toast';
import PopupMute from './popups/mute';
import {AppManagers} from '../lib/appManagers/managers';
import {FOLDER_ID_ARCHIVE, GENERAL_TOPIC_ID} from '../lib/mtproto/mtproto_config';
import showLimitPopup from './popups/limit';
import createContextMenu from '../helpers/dom/createContextMenu';
import PopupElement from './popups';
import cancelEvent from '../helpers/dom/cancelEvent';
import IS_SHARED_WORKER_SUPPORTED from '../environment/sharedWorkerSupport';
import wrapEmojiText from '../lib/richTextProcessor/wrapEmojiText';
import appImManager from '../lib/appManagers/appImManager';

// ITS =>
import appITSManager from '../its/managers/appITSManager';
// ITS <=

export default class DialogsContextMenu {
  private buttons: ButtonMenuItemOptionsVerifiable[];

  private peerId: PeerId;
  private filterId: number;
  private threadId: number;
  private dialog: Dialog | ForumTopic.forumTopic;
  private canManageTopics: boolean;
  private li: HTMLElement;

  constructor(private managers: AppManagers) {

  }

  public attach(element: HTMLElement) {
    createContextMenu({
      listenTo: element,
      buttons: this.getButtons(),
      appendTo: document.getElementById('page-chats'),
      onOpen: async(e, li) => {
        this.li = li;
        li.classList.add('menu-open');
        this.peerId = li.dataset.peerId.toPeerId();
        this.threadId = +li.dataset.threadId || undefined;
        this.dialog = await this.managers.dialogsStorage.getDialogOrTopic(this.peerId, this.threadId);
        this.filterId = this.threadId ? undefined : appDialogsManager.filterId;
        this.canManageTopics = this.threadId ? await this.managers.appChatsManager.hasRights(this.peerId.toChatId(), 'manage_topics') : undefined;
      },
      onOpenBefore: async() => {
        // delete button
        const langPackKey: LangPackKey = this.threadId ? 'Delete' : await this.managers.appPeersManager.getDeleteButtonText(this.peerId);
        const lastButton = this.buttons[this.buttons.length - 1];
        if(lastButton?.element) {
          lastButton.element.lastChild.replaceWith(i18n(langPackKey));
        }
      },
      onClose: () => {
        this.li.classList.remove('menu-open');
        this.li = this.peerId = this.dialog = this.filterId = this.threadId = this.canManageTopics = undefined;
      },
      findElement: (e) => {
        return findUpTag(e.target, DIALOG_LIST_ELEMENT_TAG);
      }
    });
  }

  private getButtons() {
    /* ITS =>  {
      icon: 'newtab',
      text: 'OpenInNewTab',
      onClick: (e) => {
        appDialogsManager.openDialogInNewTab(this.li);
        cancelEvent(e);
      },
      verify: () => IS_SHARED_WORKER_SUPPORTED
    }, ITS <= */
    return this.buttons ??= [{
      // ITS =>
      icon: 'settings',
      text: 'ITS.IsOk',
      onClick: () => this.managers.appITSManager.resetMissedStatus(this.dialog.peerId),
      verify: async() => {
        const [_isTechsupport, _isMissed] = await Promise.all([
          this.managers.appITSManager.isTechsupportDialog(this.dialog.peerId),
          this.managers.appITSManager.isMissedDialog(this.dialog.peerId)
        ]);
        return _isTechsupport && _isMissed;
      }
      // ITS <=
    }, {
      // ITS =>
      icon: 'settings',
      text: 'ITS.SetMissed',
      onClick: () => this.managers.appITSManager.setMissedStatus(this.dialog.peerId, true),
      verify: async() => {
        const [_isTechsupport, _isMissed] = await Promise.all([
          this.managers.appITSManager.isTechsupportDialog(this.dialog.peerId),
          this.managers.appITSManager.isMissedDialog(this.dialog.peerId)
        ]);
        return _isTechsupport && !_isMissed;
      }
      // ITS <=
    }, {
      icon: 'topics',
      text: 'TopicViewAsTopics',
      onClick: () => {
        appImManager.disableViewAsMessages(this.peerId);
      },
      verify: () => !!(this.dialog && (this.dialog as Dialog).pFlags.view_forum_as_messages)
    }, {
      icon: 'unread',
      text: 'MarkAsUnread',
      onClick: this.onUnreadClick,
      verify: async() => !this.threadId && !(await this.managers.appMessagesManager.isDialogUnread(this.dialog))
    }, {
      icon: 'readchats',
      text: 'MarkAsRead',
      onClick: this.onUnreadClick,
      verify: () => this.managers.appMessagesManager.isDialogUnread(this.dialog)
    }, {
      icon: 'pin',
      text: 'ChatList.Context.Pin',
      onClick: this.onPinClick,
      verify: async() => {
        if(this.threadId && !this.canManageTopics) {
          return false;
        }

        const isPinned = this.filterId !== undefined && this.filterId > 1 ?
          (await this.managers.appMessagesManager.getFilter(this.filterId)).pinnedPeerIds.includes(this.dialog.peerId) :
          !!this.dialog.pFlags?.pinned;
        return !isPinned;
      }
    }, {
      icon: 'unpin',
      text: 'ChatList.Context.Unpin',
      onClick: this.onPinClick,
      verify: async() => {
        if(this.threadId && !this.canManageTopics) {
          return false;
        }

        const isPinned = this.filterId !== undefined && this.filterId > 1 ?
          (await this.managers.appMessagesManager.getFilter(this.filterId)).pinnedPeerIds.includes(this.dialog.peerId) :
          !!this.dialog.pFlags?.pinned;
        return isPinned;
      }
    },
    // ITS => favourites
    {
      icon: 'flag',
      text: 'ITS.SetFavourite',
      onClick: () => {
        this.managers.appITSManager.setFavoriteStatus(this.dialog.peerId, true);
      },
      verify: async() => {
        const _isFavourite = await this.managers.appITSManager.isFavouriteDialog(this.dialog.peerId);
        return !_isFavourite;
      }
    },
    {
      icon: 'flag',
      text: 'ITS.UnsetFavourite',
      onClick: () => {
        this.managers.appITSManager.setFavoriteStatus(this.dialog.peerId, false);
      },
      verify: async() => {
        const _isFavourite = await this.managers.appITSManager.isFavouriteDialog(this.dialog.peerId);
        return _isFavourite;
      }
    },
    // ITS <=
    {
      icon: 'mute',
      text: 'ChatList.Context.Mute',
      onClick: this.onMuteClick,
      verify: async() => {
        return this.peerId !== rootScope.myId && !(await this.managers.appNotificationsManager.isPeerLocalMuted({peerId: this.dialog.peerId, threadId: this.threadId}));
      }
    }, {
      icon: 'unmute',
      text: 'ChatList.Context.Unmute',
      onClick: this.onUnmuteClick,
      verify: () => {
        return this.peerId !== rootScope.myId && this.managers.appNotificationsManager.isPeerLocalMuted({peerId: this.dialog.peerId, threadId: this.threadId});
      }
    }, {
      icon: 'archive',
      text: 'Archive',
      onClick: this.onArchiveClick,
      verify: () => !this.threadId && (this.dialog as Dialog).folder_id !== FOLDER_ID_ARCHIVE && this.peerId !== rootScope.myId
    }, {
      icon: 'unarchive',
      text: 'Unarchive',
      onClick: this.onArchiveClick,
      verify: () => this.filterId === FOLDER_ID_ARCHIVE && this.peerId !== rootScope.myId
    },
    // ITS => techsupport
    {
      icon: 'settings',
      text: 'ITS.SetTechsupport',
      onClick: () => {
        this.managers.appITSManager.setTechsupportStatus(this.dialog.peerId, true)
      },
      verify: async() => {
        const [isAnyGroup, isTechsupport] = await Promise.all([
          this.managers.appPeersManager.isAnyGroup(this.dialog.peerId),
          this.managers.appITSManager.isTechsupportDialog(this.dialog.peerId)
        ]);
        return isAnyGroup && !isTechsupport;
      }
    },
    {
      icon: 'settings',
      text: 'ITS.UnsetTechsupport',
      onClick: () => {
        this.managers.appITSManager.setTechsupportStatus(this.dialog.peerId, false)
      },
      verify: async() => {
        const [isAnyGroup, isTechsupport] = await Promise.all([
          this.managers.appPeersManager.isAnyGroup(this.dialog.peerId),
          this.managers.appITSManager.isTechsupportDialog(this.dialog.peerId)
        ]);
        return isAnyGroup && isTechsupport;
      }
    },
    // ITS <=
    {
      icon: 'hide',
      text: 'Hide',
      onClick: this.onHideTopicClick,
      verify: () => {
        return this.canManageTopics && (this.dialog as ForumTopic.forumTopic).id === GENERAL_TOPIC_ID;
      }
    }, {
      icon: 'lock',
      text: 'CloseTopic',
      onClick: this.onToggleTopicClick,
      verify: () => {
        return this.canManageTopics && !(this.dialog as ForumTopic.forumTopic).pFlags.closed;
      }
    }, {
      icon: 'lockoff',
      text: 'RestartTopic',
      onClick: this.onToggleTopicClick,
      verify: () => {
        return this.canManageTopics && !!(this.dialog as ForumTopic.forumTopic).pFlags.closed;
      }
    }, {
      icon: 'folder',
      text: 'FilterAddTo',
      onClick: () => {},
      inner: async() => {
        const filters = await this.managers.filtersStorage.getDialogFilters();
        return {
          buttons: filters.map((filter) => {
            const title = document.createElement('span');
            title.append(wrapEmojiText(filter.title));
            return {
              icon: 'folder',
              textElement: title,
              onClick: () => {}
            };
          })
        };
      },
      verify: () => false
    }, {
      icon: 'delete',
      className: 'danger',
      text: 'Delete',
      onClick: this.onDeleteClick,
      verify: () => {
        if(this.threadId) {
          if(!this.canManageTopics) {
            return false;
          }

          return (this.dialog as ForumTopic.forumTopic).id !== GENERAL_TOPIC_ID;
        }

        return true;
      }
    }];
  }

  private onArchiveClick = async() => {
    const dialog = await this.managers.appMessagesManager.getDialogOnly(this.peerId);
    if(dialog) {
      this.managers.appMessagesManager.editPeerFolders([dialog.peerId], +!dialog.folder_id);
    }
  };

  private onHideTopicClick = () => {
    this.managers.appChatsManager.editForumTopic({
      chatId: this.peerId.toChatId(),
      topicId: this.threadId,
      hidden: true
    });
  };

  private onToggleTopicClick = () => {
    this.managers.appChatsManager.editForumTopic({
      chatId: this.peerId.toChatId(),
      topicId: this.threadId,
      closed: !(this.dialog as ForumTopic.forumTopic).pFlags.closed
    });
  };

  private onPinClick = () => {
    const {peerId, filterId, threadId} = this;
    this.managers.appMessagesManager.toggleDialogPin({
      peerId,
      filterId,
      topicId: threadId
    })
    // ITS =>
    .then(() => {
      rootScope.dispatchEvent('its_peer_pinned_event', {peerId: peerId, filterId: filterId});
    })
    // ITS <=
    .catch(async(err: ApiError) => {
      if(err.type === 'PINNED_DIALOGS_TOO_MUCH' || err.type === 'PINNED_TOO_MUCH') {
        if(threadId) {
          this.managers.apiManager.getLimit('topicPin').then((limit) => {
            toastNew({langPackKey: 'LimitReachedPinnedTopics', langPackArguments: [limit]});
          });
        } else if(filterId >= 1) {
          toastNew({langPackKey: 'PinFolderLimitReached'});
        } else {
          showLimitPopup('pin');
        }
      }
    });
  };

  private onUnmuteClick = () => {
    this.managers.appMessagesManager.togglePeerMute({peerId: this.peerId, mute: false, threadId: this.threadId});
  };

  private onMuteClick = () => {
    PopupElement.createPopup(PopupMute, this.peerId, this.threadId);
  };

  private onUnreadClick = async() => {
    const {peerId, dialog} = this;
    if(dialog.unread_count) {
      if(!this.threadId) {
        this.managers.appMessagesManager.markDialogUnread(peerId, true);
      } else {
        this.managers.appMessagesManager.readHistory(peerId, dialog.top_message, this.threadId);
      }
    } else if(!this.threadId) {
      this.managers.appMessagesManager.markDialogUnread(peerId);
    }
  };

  private onDeleteClick = () => {
    PopupElement.createPopup(PopupDeleteDialog, this.peerId, undefined, undefined, this.threadId);
  };
}
