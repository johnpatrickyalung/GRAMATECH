export type Category = {
  id: string
  name: string
  createdAt: number
  sortOrder: number
}

export type GlossaryWord = {
  id: string
  categoryId: string
  term: string
  definition: string
  audioUrl: string
  paraanNgPagbigkas: string
  bahagiNgPananalita: string
  kahulugangPangGramatika: string
  salinSaIloko: string
  salinSaKapampangan: string
  halimbawaPangungusap: string
  createdAt: number
}

export type WordFormFields = {
  term: string
  definition: string
  paraanNgPagbigkas: string
  bahagiNgPananalita: string
  kahulugangPangGramatika: string
  salinSaIloko: string
  salinSaKapampangan: string
  halimbawaPangungusap: string
}
