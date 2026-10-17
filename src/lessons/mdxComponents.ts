import { EarQuiz } from '../components/exercises/EarQuiz'
import { FindNotes } from '../components/exercises/FindNotes'
import { NoteDrill } from '../components/exercises/NoteDrill'
import { Quiz } from '../components/exercises/Quiz'
import { Callout } from '../components/lesson/Callout'
import { CircleOfFifths } from '../components/lesson/CircleOfFifths'
import { OnlyFor } from '../components/lesson/OnlyFor'
import { Play } from '../components/lesson/Play'
import { PlayChords } from '../components/lesson/PlayChords'
import { Show } from '../components/lesson/Show'

/** Các component dùng được trực tiếp trong file bài học .mdx mà không cần import. */
export const mdxComponents = { Show, Play, PlayChords, OnlyFor, Callout, CircleOfFifths, Quiz, FindNotes, EarQuiz, NoteDrill }
