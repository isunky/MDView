export function RecentFileName({ title }: { title: string }) {
  const characters = Array.from(title)
  if (characters.length <= 24) return title

  const split = characters.length - Math.min(16, Math.floor(characters.length / 2))

  return <span className="recent-file-name">
    <span>{characters.slice(0, split).join('')}</span>
    <span>{characters.slice(split).join('')}</span>
  </span>
}
