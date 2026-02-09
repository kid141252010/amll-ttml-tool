import type { TFunction } from "i18next";
import { Box, Button, Dialog, Flex, Text } from "@radix-ui/themes";
import {
	Checkmark20Regular,
	Delete20Regular,
	DeleteDismiss20Regular,
	Dismiss20Regular,
	SelectAllOn20Regular,
} from "@fluentui/react-icons";

type StashCard = {
	lines: number[];
	items: Array<{ label: string; wordId: string }>;
};

export type StashDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stashCards: StashCard[];
	selectedIds: Set<string>;
	stashItemsCount: number;
	onToggleItem: (wordId: string) => void;
	onClose: () => void;
	onRemoveSelected: () => void;
	onClear: () => void;
	onConfirm: () => void;
	t: TFunction;
};

export const StashDialog = ({
	open,
	onOpenChange,
	stashCards,
	selectedIds,
	stashItemsCount,
	onToggleItem,
	onClose,
	onRemoveSelected,
	onClear,
	onConfirm,
	t,
}: StashDialogProps) => {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content maxWidth="520px">
				<Dialog.Title>
					{t("review.TimingStash.title", "暂存时间轴结果")}
				</Dialog.Title>
				<Flex direction="row" gap="3" align="start" wrap="wrap">
					{stashCards.length === 0 ? (
						<Text size="2" color="gray">
							{t("review.TimingStash.empty", "暂无暂存结果")}
						</Text>
					) : (
						stashCards.map((card) => {
							const key = card.items.map((item) => item.wordId).join("-");
							const hasCrossLine = Boolean(card.lines[1]);
							return (
								<Box
									key={key}
									style={{
										display: "inline-grid",
										gridTemplateColumns: hasCrossLine
											? "max-content max-content max-content"
											: "max-content",
										rowGap: "6px",
										columnGap: "6px",
										borderRadius: "12px",
										border: "1px solid var(--gray-a6)",
										padding: "10px 12px",
										backgroundColor: "var(--gray-a2)",
									}}
								>
									{hasCrossLine ? (
										<>
											<Text
												size="2"
												weight="bold"
												style={{ gridColumn: "1 / 2", justifySelf: "center" }}
											>
												{`第 ${card.lines[0]} 行`}
											</Text>
											<Text
												size="2"
												color="gray"
												style={{ gridColumn: "2 / 3", justifySelf: "center" }}
											>
												|
											</Text>
											<Text
												size="2"
												color="gray"
												style={{ gridColumn: "3 / 4", justifySelf: "center" }}
											>
												{`第 ${card.lines[1]} 行`}
											</Text>
										</>
									) : (
										<Text
											size="2"
											weight="bold"
											style={{ gridColumn: "1 / -1", justifySelf: "center" }}
										>
											{`第 ${card.lines[0]} 行`}
										</Text>
									)}
									<Flex
										align="center"
										wrap="wrap"
										gap="1"
										style={{
											gridColumn: hasCrossLine ? "1 / 2" : "1 / -1",
											justifySelf: "center",
										}}
									>
										{card.items.map((item, index) => {
											const checked = selectedIds.has(item.wordId);
											return (
												<Flex key={`${item.wordId}-${index}`} align="center" gap="1">
													<Button
														size="1"
														variant={checked ? "solid" : "soft"}
														color={checked ? "orange" : "gray"}
														onClick={() => onToggleItem(item.wordId)}
														asChild
													>
														<span>{item.label}</span>
													</Button>
													{index < card.items.length - 1 ? (
														<Text size="2" color="gray" asChild>
															<span
																style={{
																	display: "inline-flex",
																	alignItems: "center",
																}}
															>
																|
															</span>
														</Text>
													) : null}
												</Flex>
											);
										})}
									</Flex>
								</Box>
							);
						})
					)}
				</Flex>
				<Flex gap="3" mt="4" justify="end">
					<Button
						variant="soft"
						color="gray"
						onClick={() => {
							const allIds = new Set<string>();
							stashCards.forEach((card) => {
								card.items.forEach((it) => {
									allIds.add(it.wordId);
								});
							});
							allIds.forEach((id) => {
								if (!selectedIds.has(id)) onToggleItem(id);
							});
						}}
						disabled={stashItemsCount === selectedIds.size || stashItemsCount === 0}
					>
						<SelectAllOn20Regular />
						{t("common.selectAll", "全选")}
					</Button>
					<Button variant="soft" color="gray" onClick={onClose}>
						<Dismiss20Regular />
						{t("common.close", "关闭")}
					</Button>
					<Button
						variant="soft"
						color="red"
						onClick={onRemoveSelected}
						disabled={selectedIds.size === 0}
					>
						<Delete20Regular />
						{t("review.TimingStash.removeSelected", "删除选中")}
					</Button>
					<Button
						variant="soft"
						color="orange"
						onClick={onClear}
						disabled={stashItemsCount === 0}
					>
						<DeleteDismiss20Regular />
						{t("review.TimingStash.clear", "清空")}
					</Button>
					<Button onClick={onConfirm} disabled={selectedIds.size === 0}>
						<Checkmark20Regular />
						{t("common.confirm", "确认")}
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
