import React from 'react'
import { Provider } from 'react-redux'
import store from './store'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'

export default function App() {
  return (
    <Provider store={store}>
      <MainLayout>
        <Home />
      </MainLayout>
    </Provider>
  )
}
