import React from 'react'
import ReactDOM from 'react-dom'
import {BrowserRouter, Route} from 'react-router-dom';
import './index.css'
import registerServiceWorker from './registerServiceWorker'
import web3Util from './util/web3Util'
import App from './App'
import { _initConfigs } from './util/config'

web3Util.getWeb3
  .then(_web3 => {
    // Instantiate contract once web3 provided.
    _initConfigs(_web3)
      .then(() => ReactDOM.render(
        <BrowserRouter>
          <Route path='/' component={App} />
        </BrowserRouter>,
    document.getElementById('root'))
  )
  .catch((err) => {
    console.log(err)
    alert(err)
  })
  })
  .catch(() => {
    console.log('Error finding web3.')
  })

registerServiceWorker()
