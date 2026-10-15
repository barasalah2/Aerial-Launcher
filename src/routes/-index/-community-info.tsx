import type { MouseEventHandler } from 'react'

import { images } from '../../images'

import { whatIsThis } from '../../lib/callbacks'

const information: Array<{
  url: string
  text: string
  imageUrl: string
}> = [
  {
    url: 'https://stw.news/',
    text: 'STW News',
    imageUrl: images['aerial-stwnews'],
  },
  {
    url: 'https://discord.gg/XbGSTuXZdy',
    text: 'ML Corp',
    imageUrl: images['aerial-ml-corp'],
  },
]

export function CommunityInfo() {
  const handleOpenLink =
    (url: string): MouseEventHandler =>
    (event) => {
      event.preventDefault()

      window.electronAPI.openExternalURL(url)
    }

  return (
    <section
      className="bg-muted-foreground/5 -mt-4 -mx-4 lg:-mt-6 lg:-mx-6"
      aria-label="support and projects"
    >
      <div className="flex flex-col gap-1 justify-center mx-auto max-w-lg py-2 w-full">
        <ul className="flex gap-1 items-center mx-auto">
          {information.map((link, index) => (
            <li
              className=""
              key={index}
            >
              <a
                href={link.url}
                className="border-2 border-transparent flex font-medium gap-2 h-9 items-center pl-1.5 pr-2.5 py-1 rounded text-base transition-colors hover:bg-secondary"
                onClick={handleOpenLink(link.url)}
                onAuxClick={whatIsThis()}
              >
                <img
                  src={link.imageUrl}
                  className="flex-shrink-0 size-6"
                  alt="icon"
                />
                <span className="-mt-1">{link.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
