import type { TFunction } from "i18next";
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import exportTTMLText from "$/modules/project/logic/ttml-writer";
import { hideSubmitAMLLDBWarningAtom } from "$/modules/settings/states";
import { submitToAMLLDBDialogAtom } from "$/states/dialogs.ts";
import { lyricLinesAtom } from "$/states/main";
import { pushNotificationAtom } from "$/states/notifications";
import type { TTMLMetadata } from "$/types/ttml";

export type NameFieldKey = "artists" | "musicName" | "album" | "remark";
export type NameFieldItem = {
	key: NameFieldKey;
	label: string;
	value: string;
	options: string[];
	onChange: (value: string) => void;
};

const metadataAtom = atom((get) => get(lyricLinesAtom).metadata);
const issuesAtom = atom((get) => {
	const result: string[] = [];
	const metadatas = get(metadataAtom);

	if (
		metadatas.findIndex((m) => m.key === "musicName" && m.value.length > 0) ===
		-1
	)
		result.push("元数据缺少音乐名称");

	if (
		metadatas.findIndex((m) => m.key === "artists" && m.value.length > 0) === -1
	)
		result.push("元数据缺少音乐作者");

	if (
		metadatas.findIndex((m) => m.key === "album" && m.value.length > 0) === -1
	)
		result.push("元数据缺少音乐专辑名称");

	const platforms = new Set([
		"ncmMusicId",
		"qqMusicId",
		"spotifyId",
		"appleMusicId",
	]);

	if (
		metadatas.findIndex((m) => platforms.has(m.key) && m.value.length > 0) ===
		-1
	)
		result.push("元数据缺少音乐平台对应歌曲 ID");

	return result;
});

const defaultNameOrder: NameFieldKey[] = [
	"artists",
	"musicName",
	"album",
	"remark",
];

const normalizeMetaValues = (metadatas: TTMLMetadata[], key: NameFieldKey) => {
	const raw = metadatas.find((m) => m.key === key)?.value ?? [];
	return raw.map((value) => value.trim()).filter((value) => value.length > 0);
};

const validateMetadata = (
	metadatas: TTMLMetadata[],
	t: TFunction,
): string[] => {
	const result: string[] = [];
	const musicName = metadatas.find((m) => m.key === "musicName");
	if (!musicName?.value?.length) {
		result.push(
			t("submitToAMLLDB.validation.missingMusicName", "元数据缺少音乐名称"),
		);
	}

	const artists = metadatas.find((m) => m.key === "artists");
	if (!artists?.value?.length) {
		result.push(
			t("submitToAMLLDB.validation.missingArtists", "元数据缺少音乐作者"),
		);
	}

	const album = metadatas.find((m) => m.key === "album");
	if (!album?.value?.length) {
		result.push(
			t("submitToAMLLDB.validation.missingAlbum", "元数据缺少音乐专辑名称"),
		);
	}

	const musicIds = [
		metadatas.find((m) => m.key === "ncmMusicId"),
		metadatas.find((m) => m.key === "qqMusicId"),
		metadatas.find((m) => m.key === "spotifyId"),
		metadatas.find((m) => m.key === "appleMusicId"),
		metadatas.find((m) => m.key === "isrc"),
	];

	if (!musicIds.some((id) => id?.value?.length)) {
		result.push(
			t(
				"submitToAMLLDB.validation.missingMusicId",
				"元数据缺少音乐平台对应歌曲 ID",
			),
		);
	}

	return result;
};

export const useSubmitToAMLLDBDialog = () => {
	const { t } = useTranslation();
	const [dialogOpen, setDialogOpen] = useAtom(submitToAMLLDBDialogAtom);
	const [hideWarning, setHideWarning] = useAtom(hideSubmitAMLLDBWarningAtom);
	const metadatas = useAtomValue(metadataAtom);
	const issues = useAtomValue(issuesAtom);
	const [nameOrder, setNameOrder] = useState<NameFieldKey[]>(defaultNameOrder);
	const [artistSelections, setArtistSelections] = useState<string[]>([]);
	const [musicNameValue, setMusicNameValue] = useState("");
	const [albumValue, setAlbumValue] = useState("");
	const [remarkValue, setRemarkValue] = useState("");
	const [comment, setComment] = useState("");
	const [processing, setProcessing] = useState(false);
	const [submitReason, setSubmitReason] = useState(
		t("submitToAMLLDB.defaultReason", "新歌词提交"),
	);
	const emptySelectValue = "__select_empty__";
	const noDataSelectValue = "__select_no_data__";
	const store = useStore();
	const setPushNotification = useSetAtom(pushNotificationAtom);

	const artistOptions = useMemo(
		() => normalizeMetaValues(metadatas, "artists"),
		[metadatas],
	);
	const musicNameOptions = useMemo(
		() => normalizeMetaValues(metadatas, "musicName"),
		[metadatas],
	);
	const albumOptions = useMemo(
		() => normalizeMetaValues(metadatas, "album"),
		[metadatas],
	);

	useEffect(() => {
		setArtistSelections((prev) => {
			if (!artistOptions.length) return [];
			const filtered = prev.filter((value) => artistOptions.includes(value));
			if (filtered.length === 0) return [artistOptions[0]];
			return filtered;
		});
	}, [artistOptions]);

	useEffect(() => {
		if (!musicNameOptions.length) {
			if (musicNameValue) setMusicNameValue("");
			return;
		}
		if (!musicNameOptions.includes(musicNameValue)) {
			setMusicNameValue(musicNameOptions[0]);
		}
	}, [musicNameOptions, musicNameValue]);

	useEffect(() => {
		if (!albumOptions.length) {
			if (albumValue && albumValue !== emptySelectValue) setAlbumValue("");
			return;
		}
		if (albumValue === emptySelectValue) return;
		if (!albumOptions.includes(albumValue)) {
			setAlbumValue(albumOptions[0]);
		}
	}, [albumOptions, albumValue]);

	const artistDisplayValue = useMemo(
		() => artistSelections.join(" / "),
		[artistSelections],
	);

	const onArtistSelectionChange = useCallback(
		(value: string, checked: boolean) => {
			setArtistSelections((prev) => {
				if (checked) {
					if (prev.includes(value)) return prev;
					return [...prev, value];
				}
				if (prev.length === 1 && prev[0] === value) return prev;
				return prev.filter((item) => item !== value);
			});
		},
		[],
	);

	const fieldItems: Record<NameFieldKey, NameFieldItem> = useMemo(
		() => ({
			artists: {
				key: "artists",
				label: "歌手",
				value: artistDisplayValue,
				options: artistOptions,
				onChange: () => {},
			},
			musicName: {
				key: "musicName",
				label: "歌曲名",
				value: musicNameValue,
				options: musicNameOptions,
				onChange: setMusicNameValue,
			},
			album: {
				key: "album",
				label: "专辑",
				value: albumValue,
				options: albumOptions,
				onChange: setAlbumValue,
			},
			remark: {
				key: "remark",
				label: "备注",
				value: remarkValue,
				options: [],
				onChange: setRemarkValue,
			},
		}),
		[
			artistDisplayValue,
			artistOptions,
			musicNameValue,
			musicNameOptions,
			albumValue,
			albumOptions,
			remarkValue,
		],
	);

	const orderedFieldKeys = useMemo(() => {
		const filtered = nameOrder.filter((key) => defaultNameOrder.includes(key));
		const missing = defaultNameOrder.filter((key) => !filtered.includes(key));
		return [...filtered, ...missing];
	}, [nameOrder]);

	const orderedFieldItems = useMemo(
		() => orderedFieldKeys.map((key) => fieldItems[key]),
		[orderedFieldKeys, fieldItems],
	);

	const name = useMemo(() => {
		const segments = orderedFieldItems
			.map((item) => item.value)
			.filter((value) => value.length > 0 && value !== emptySelectValue);
		return segments.join(" - ");
	}, [orderedFieldItems]);

	const onNameOrderMove = useCallback(
		(
			fromKey: NameFieldKey,
			toKey: NameFieldKey,
			position: "before" | "after",
		) => {
			if (fromKey === toKey) return;
			setNameOrder((prev) => {
				const next = prev.filter((item) => item !== fromKey);
				const targetIndex = next.indexOf(toKey);
				if (targetIndex < 0) return prev;
				const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
				next.splice(insertIndex, 0, fromKey);
				return next;
			});
		},
		[],
	);

	//TODO: 接入新的提交流程(.\issue-builder => github\gist-service => github\issue-service => github\api)

	const onSubmit = useCallback(async () => {
		return console.log("not implemented yet");
	}, []);

	return {
		artistSelections,
		comment,
		dialogOpen,
		emptySelectValue,
		hideWarning,
		issues,
		noDataSelectValue,
		onNameOrderMove,
		onSubmit,
		orderedFieldItems,
		processing,
		remarkValue,
		onArtistSelectionChange,
		setComment,
		setDialogOpen,
		setHideWarning,
		setRemarkValue,
		setSubmitReason,
		submitReason,
	};
};
