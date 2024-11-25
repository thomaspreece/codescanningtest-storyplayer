const types = [
    "STORY_NAVIGATION",
    "RENDERER_ACTION",
    "USER_ACTION",
    "SEGMENT_COMPLETION",
]
const names = [
    "NARRATIVE_ELEMENT_CHANGE",
    "ENTER_SUB_STORY",
    "STORY_END",
    "SWITCHABLE_REPRESENTATION_SWITCH",
    "COMPLETE_BEHAVIOUR_PHASE_STARTED",
    "DURING_BEHAVIOUR_STARTED",
    "VIDEO_PAUSE",
    "VIDEO_UNPAUSE",
    "PLAY_PAUSE_BUTTON_CLICKED",
    "SEEK_FORWARD_BUTTON_CLICKED",
    "SEEK_BACKWARD_BUTTON_CLICKED",
    "BACK_BUTTON_CLICKED",
    "NEXT_BUTTON_CLICKED",
    "START_BUTTON_CLICKED",
    "SUBTITLES_BUTTON_CLICKED",
    "FULLSCREEN_BUTTON_CLICKED",
    "PIP_MODE_CHANGED",
    "VOLUME_CHANGED",
    "VOLUME_MUTE_TOGGLED",
    "VIDEO_SCRUBBED",
    "OVERLAY_BUTTON_CLICKED",
    "OVERLAY_DEACTIVATED",
    "BUTTONS_ACTIVATED",
    "BUTTONS_DEACTIVATED",
    "CHANGE_CHAPTER_BUTTON_CLICKED",
    "SWITCH_VIEW_BUTTON_CLICKED",
    "LINK_CHOICE_CLICKED",
    "BEHAVIOUR_CONTINUE_BUTTON_CLICKED",
    "BEHAVIOUR_CANCEL_BUTTON_CLICKED",
    "VR_ORIENTATION_CHANGED",
    "BROWSER_VISIBILITY_CHANGE",
    "BROWSER_CLOSE_CLICKED",
    "WINDOW_ORIENTATION_CHANGE",
    "USER_SET_VARIABLE",
    "VARIABLE_PANEL_NEXT_CLICKED",
    "VARIABLE_PANEL_BACK_CLICKED",
    "SOCIAL_SHARE_CLICKED",
    "OUTWARD_LINK_CLICKED",
    "MAP_OVERLAY_LINK_CLICKED",
]

interface AnalyticEvents {
    names: Record<string, string>
    types: Record<string, string>
}
const AnalyticEvents: AnalyticEvents = {
    names: names.reduce((events, eventName) => {
        // eslint-disable-next-line no-param-reassign
        events[eventName] = eventName
        const event = eventName
        return events
    }, {}),
    types: types.reduce((events, eventName) => {
        // eslint-disable-next-line no-param-reassign
        events[eventName] = eventName
        return events
    }, {}),
}
export type AnalyticsPayload = {
    type: AnalyticEventType
    name: AnalyticEventType
    from?: string
    to?: string | number
    current_narrative_element?: string
    current_representation?: string
}
export type AnalyticEventName = string
export type AnalyticEventType = string
export type AnalyticsLogger = (payload: AnalyticsPayload) => unknown
export default AnalyticEvents
