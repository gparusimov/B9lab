import React, { Component } from 'react'
import './App.css'
import {
    Nav,
    NavItem,
    Col,
    Row,
    PageHeader
} from 'react-bootstrap/lib'
import RegulatorComponent from './components/RegulatorComponent'
import OperatorComponent from './components/OperatorComponent'
import VehicleComponent from './components/VehicleComponent'
import TollBoothComponent from './components/TollBoothComponent'
import { CONFIG } from './util/config'
import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';


class App extends Component {
    constructor (props) {
        super(props);
        this.state = {
            locationPage: 1,
            vehicles: [],
            operators: [],
            tollBooths:[],
            roadPrices:[],
            vehicleHistory: [],
            activeScreen: '/regulator'
        };
        console.log(CONFIG.accounts)
    }

    handleOnSelect (selectedScreen) {
        this.setState({ activeScreen: selectedScreen });
        this.props.history.push(selectedScreen);

    }
    async componentWillMount () {
        this.setState({
            ...this.state,
            disable: false
        })
    }
    changeState(field, value){
        this.setState({[field] :value});
    }

    renderPage(){
        if(this.state.locationPage === 1){
            return(
                <div>
                    <RegulatorComponent changeParentState={this.changeState.bind(this)} parentState = {this.state}/>
                </div>
            )
        } else  if(this.state.locationPage === 2){
            return(
                <div>
                    <OperatorComponent changeParentState={this.changeState.bind(this)} parentState = {this.state}/>
                </div>
            )
        } else  if(this.state.locationPage === 3){
            return(
                <div>
                    <VehicleComponent changeParentState={this.changeState.bind(this)} parentState = {this.state} />
                </div>
            )
        } else if(this.state.locationPage === 4){
            return(
                <div>
                    <TollBoothComponent changeParentState={this.changeState.bind(this)} parentState = {this.state} />
                </div>
            )
        }
    }

    changeLocationPage(page){
        this.setState({...this.state, locationPage:page});
    }

    render () {
        return (
            <div>
                <PageHeader style={{background: '#337ab7'}}>
                    <center>Toll Roads</center>
                </PageHeader>
                <div>
                    <Row>
                        <Col md={12} sm={12}>
                            <Nav bsStyle='pills' stacked activeKey={this.state.activeScreen} onSelect={this.handleOnSelect.bind(this)}>
                                <NavItem onClick={()=>{this.changeLocationPage(1)}} eventKey='/regulator'>
                                    Regulator
                                </NavItem>
                                <NavItem onClick={()=>{this.changeLocationPage(2)}} eventKey='/operator'>
                                    Operators
                                </NavItem>
                                <NavItem onClick={()=>{this.changeLocationPage(3)}} eventKey='/toll-booth'>
                                    Vehicle
                                </NavItem>
                                <NavItem onClick={()=>{this.changeLocationPage(4)}} eventKey='/vehicle' >
                                    TollBooths
                                </NavItem>
                            </Nav>
                            {this.renderPage()}
                        </Col>
                    </Row>
                </div>
            </div>
        )
    }
}

export default App
