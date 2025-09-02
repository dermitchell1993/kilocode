import { HTMLAttributes, useMemo } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Monitor } from "lucide-react"

import { SetCachedStateField } from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { TaskTimeline } from "../chat/TaskTimeline"
import { generateSampleTimelineData } from "../../utils/timeline/mockData"

type DisplaySettingsProps = HTMLAttributes<HTMLDivElement> & {
	showTaskTimeline?: boolean
	requireModifierKeyForSubmit?: boolean
	setCachedStateField: SetCachedStateField<"showTaskTimeline" | "requireModifierKeyForSubmit">
}

export const DisplaySettings = ({ showTaskTimeline, requireModifierKeyForSubmit, setCachedStateField, ...props }: DisplaySettingsProps) => {
	const { t } = useAppTranslation()

	const sampleTimelineData = useMemo(() => generateSampleTimelineData(), [])

	return (
		<div {...props}>
			<SectionHeader>
				<div className="flex items-center gap-2">
					<Monitor className="w-4" />
					<div>{t("settings:sections.display")}</div>
				</div>
			</SectionHeader>

			<Section>
				<div>
					<VSCodeCheckbox
						checked={showTaskTimeline}
						onChange={(e: any) => {
							setCachedStateField("showTaskTimeline", e.target.checked)
						}}>
						<span className="font-medium">{t("settings:display.taskTimeline.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("settings:display.taskTimeline.description")}
					</div>

					{/* Sample TaskTimeline preview */}
					<div className="mt-3">
						<div className="font-medium text-vscode-foreground text-xs mb-4">Preview</div>
						<div className="opacity-60">
							<TaskTimeline groupedMessages={sampleTimelineData} isTaskActive={false} />
						</div>
					</div>
				</div>
			</Section>

			<Section>
				<div>
					<VSCodeCheckbox
						checked={requireModifierKeyForSubmit}
						onChange={(e: any) => {
							setCachedStateField("requireModifierKeyForSubmit", e.target.checked)
						}}>
						<span className="font-medium">Require modifier key for chat submission</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						When enabled, requires Ctrl/Cmd+Enter to submit messages. When disabled, pressing Enter will submit messages (original behavior).
					</div>
				</div>
			</Section>
		</div>
	)
}
