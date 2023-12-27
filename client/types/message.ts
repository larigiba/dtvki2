export type Message = {
    role: "user" | "assistant"
    content: string
    links?: string[]
    titles?: string[]
    docnumbers?: string[]
    tutorialLinks?: string[]
    relevances?: string[]
}