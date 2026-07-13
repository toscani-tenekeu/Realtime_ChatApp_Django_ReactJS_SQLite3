import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip, makeStyles, tokens, Text } from "@fluentui/react-components";
import {
  ArrowLeftRegular,
  MoreHorizontalRegular,
  PinRegular,
  PinOffRegular,
  SpeakerMuteRegular,
  Speaker2Regular,
  ArchiveRegular,
  ArchiveArrowBackRegular,
  InfoRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import type { Conversation } from "@/services/types";
import { Avatar } from "@/components/Avatar";
import { chatService } from "@/services";
import { conversationAvatar, conversationSubtitle, conversationTitle } from "@/features/chat/helpers";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    minHeight: "60px",
  },
  info: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", cursor: "pointer" },
  title: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400 },
  subtitle: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
});

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onOpenDetails: () => void;
  onOpenSearch: () => void;
}

export function ChatHeader({ conversation, onBack, onOpenDetails, onOpenSearch }: Props) {
  const s = useStyles();
  const avatar = conversationAvatar(conversation);
  return (
    <div className={s.root}>
      {onBack ? (
        <Tooltip content="Back" relationship="label">
          <Button aria-label="Back to conversations" appearance="subtle" icon={<ArrowLeftRegular />} onClick={onBack} />
        </Tooltip>
      ) : null}
      <Avatar name={avatar.name} image={avatar.image} presence={avatar.presence} showPresence={conversation.kind === "dm"} size={36} />
      <button className={s.info} onClick={onOpenDetails} aria-label="View conversation details" style={{ background: "transparent", border: "none", textAlign: "left" }}>
        <Text className={s.title} truncate wrap={false}>{conversationTitle(conversation)}</Text>
        <Text className={s.subtitle} truncate wrap={false}>{conversationSubtitle(conversation)}</Text>
      </button>
      <Tooltip content="Search messages" relationship="label">
        <Button aria-label="Search messages" appearance="subtle" icon={<SearchRegular />} onClick={onOpenSearch} />
      </Tooltip>
      <Tooltip content="Details" relationship="label">
        <Button aria-label="Conversation details" appearance="subtle" icon={<InfoRegular />} onClick={onOpenDetails} />
      </Tooltip>
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip content="Conversation options" relationship="label">
            <Button aria-label="Conversation options" appearance="subtle" icon={<MoreHorizontalRegular />} />
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem
              icon={conversation.pinned ? <PinOffRegular /> : <PinRegular />}
              onClick={() => chatService.pinConversation(conversation.id, !conversation.pinned)}
            >
              {conversation.pinned ? "Unpin" : "Pin"} conversation
            </MenuItem>
            <MenuItem
              icon={conversation.muted ? <Speaker2Regular /> : <SpeakerMuteRegular />}
              onClick={() => chatService.muteConversation(conversation.id, !conversation.muted)}
            >
              {conversation.muted ? "Unmute" : "Mute"} notifications
            </MenuItem>
            <MenuItem
              icon={conversation.archived ? <ArchiveArrowBackRegular /> : <ArchiveRegular />}
              onClick={() => chatService.archiveConversation(conversation.id, !conversation.archived)}
            >
              {conversation.archived ? "Unarchive" : "Archive"} chat
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    </div>
  );
}
