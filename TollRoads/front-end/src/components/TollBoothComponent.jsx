import React, { Component } from 'react'
import {
    Grid,
    Col,
    Row,
    Panel,
    FormGroup,
    Label,
    Button,
    FormControl,
    ControlLabel
} from 'react-bootstrap/lib'
import * as OperatorService from '../services/OperatorService';

import { CONFIG } from '../util/config'


class TollBoothComponent extends Component {
    constructor (props, context) {
        super(props, context)

        this.handleChange = this.handleChange.bind(this)

        this.state = {
            gas: CONFIG.DEFAULT_GAS_LIMIT,
            vehicle: '',
            operatorAddress: '',
            booth: '',
            password: '',
            vehicleHistoryText: '',
            disabled: true
        }
    }

    async componentWillMount () {
        this.setState({
            ...this.state,
            disabled: true
        })
    }

    setDisabled () {
        this.setState({
            ...this.state,
            disabled: true
        })
    }


    handleChange (e) {
        this.setState({ ...this.state, [e.target.id]: e.target.value });
    }

    async checkIfVehicleOnRoad(vehicleHistory) {
        if (vehicleHistory && vehicleHistory.length) {
            let infoText='';
            for (let i = 0; i < vehicleHistory.length; i++) {
                if (vehicleHistory[i].action === 'Enter the road') {
                    infoText += `Vehicle ${this.state.vehicle} enters ${vehicleHistory[i].entryBooth} with  deposit ${vehicleHistory[i].deposit} \n`;
                }
            }
                return await infoText;
            }
            return await false;
        }

    async selectVehicle (e) {
        const vehicle = e.target.value;
        const vehicleHistory = this.props.parentState.vehicleHistory[vehicle];

        await this.setState({
            ...this.state,
            vehicle
        });
        let infoText;

        if( infoText = await this.checkIfVehicleOnRoad(vehicleHistory)) {
        } else {
            infoText = `Vehicle ${vehicle} doesn't enter the road`;
        }

        await this.setState({
            ...this.state,
            password: '',
            vehicleHistoryText: infoText,
            disabled: false
        })
    }

    async selectOperator (e) {
        const operatorAddress = e.target.value;
        await this.getAllOperatorInfo(operatorAddress);
        if (operatorAddress && this.state.isPaused){
            await this.runOperator();
        }
    }

    async runOperator() {
        await OperatorService.setPaused(this.state.operatorAddress, false, this.state.operatorOwner, this.state.gas );
        const isPaused = await OperatorService.isOperatorPaused(this.state.operatorAddress);
        this.setState({ ...this.state, isPaused })
    }

    async getAllOperatorInfo (operatorAddress) {
        if (operatorAddress) {
            this.setDisabled();
            const isPaused = await OperatorService.isOperatorPaused(operatorAddress);

            await this.setState({
                ...this.state,
                operatorAddress,
                isPaused,
                vehicle: '',
                booth: '',
                password: '',
                vehicleHistoryText: '',
                disabled: false
            })

        } else this.setState({ ...this.state, operatorAddress })
    }

    async exitRoad () {
        this.setDisabled();
        const txReportExitRoad = await OperatorService.reportExitRoad(this.state.operatorAddress, this.state.booth,
            this.state.password, this.state.gas);

        if (txReportExitRoad && txReportExitRoad.logs.length > 0) {
            const exitSecretHashed = txReportExitRoad.logs[0].args.exitSecretHashed;
            const exitBooth = txReportExitRoad.logs[0].args.exitBooth;
            let newReportExitObj;
            let newState;
            let infoText;

            if (txReportExitRoad.logs[0].event === 'LogRoadExited'){
                const finalFee = txReportExitRoad.logs[0].args.finalFee;
                const refundWeis = txReportExitRoad.logs[0].args.refundWeis;

                newReportExitObj = {
                    exitBooth,
                    finalFee,
                    refundWeis,
                    exitSecretHashed,
                    action: 'Exited',
                    event:'LogRoadExited'
                };

                infoText =`Vehicle ${this.state.vehicle} exited on ${newReportExitObj.exitBooth} 
                 with ${newReportExitObj.finalFee} and refund  ${newReportExitObj.refundWeis}`
            } else if (txReportExitRoad.logs[0].event === 'LogPendingPayment') {

                newReportExitObj = {
                    exitBooth,
                    exitSecretHashed,
                    action: 'Pending payment',
                    event:'LogPendingPayment'
                };
                infoText =`Vehicle ${this.state.vehicle} exited on ${newReportExitObj.exitBooth} 
                 with pending payment`;
            }

            const vehicle = this.state.vehicle;
            const vehicleHistory = this.props.parentState.vehicleHistory[vehicle];
            newState = await this.updateVehicleHistory(vehicleHistory, newReportExitObj);

            await this.props.changeParentState('vehicleHistory', newState);
            await this.setState({...this.state, vehicleHistoryText: infoText});
        }
        this.setState({...this.state, disabled: false})
    }

    async updateVehicleHistory( vehicleHistory, report ){
        if (vehicleHistory && vehicleHistory.length) {
            for(let i = 0; i < vehicleHistory.length; i++){
                if (vehicleHistory[i].exitSecretHashed === report.exitSecretHashed){
                    if (report.event === 'LogRoadExited') {
                        vehicleHistory[i].exitBooth = report.exitBooth;
                        vehicleHistory[i].finalFee = report.finalFee;
                        vehicleHistory[i].action = report.action;
                        vehicleHistory[i].refundWeis = report.refundWeis;

                    } else if (report.event === 'LogPendingPayment'){
                        vehicleHistory[i].exitBooth = report.exitBooth;
                        vehicleHistory[i].action = report.action;
                    }

                    let newState = await {
                        ...this.props.parentState.vehicleHistory,
                        [this.state.vehicle]: vehicleHistory};
                    return await newState;
                }
            }
            return await false;
        }
        return await false;

    }

    render () {
        const vehicles = this.props.parentState.vehicles
            .map(vcl => (<option key={vcl.vehicle} value={vcl.vehicle}>{vcl.vehicle}</option>));
        const operators = this.props.parentState.operators
            .map(op => (<option key={op.operator} value={op.operator}>{op.operator}</option>));
        const booths = (this.props.parentState.tollBooths[this.state.operatorAddress] || [])
            .map(bth => (<option key={bth.tollBooth} value={bth.tollBooth}>{bth.tollBooth}</option>));

        return (
            <div>
                <Row className='show-grid'>
                    <Col  md={12}>
                        <Panel bsStyle="primary">
                            <Panel.Heading>
                                <Panel.Title componentClass="h2"><b><center>Tool booth actions </center></b></Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>
                                <Row>
                                    <Col md={4} lg={4}>
                                    </Col>
                                    <Col md={4} lg={4}>
                                        <FormGroup controlId='operatorAddress' >
                                            <ControlLabel>Select operator</ControlLabel>
                                            <FormControl  componentClass='select' placeholder='select'
                                                          value={this.state.operatorAddress}
                                                          onChange={ this.selectOperator.bind(this) }>
                                                <option value={''}>Select</option>
                                                {operators}
                                            </FormControl>
                                        </FormGroup>
                                    </Col>
                                    <Col md={4} lg={4}>
                                    </Col>
                                </Row>

                                <Row className='show-grid'>
                                    <Col md={2} lg={2}>
                                    </Col>

                                    <Col md={8} lg={8}>
                                        <Label bsStyle='warning'>{this.state.disabled ? 'Please wait' : ''}</Label>
                                    </Col>

                                    <Col md={2} lg={2}>
                                    </Col>

                                </Row>

                                <Row className='show-grid'>

                                    <Col xs={2} md={2} lg={2}>
                                    </Col>

                                    {/* Enter Tool booth*/}
                                    <Col xs={12} md={8} lg={8}>
                                        <Panel bsStyle="primary">
                                            <Panel.Heading>
                                                <Panel.Title componentClass="h2"><b>Tool booth</b></Panel.Title>
                                            </Panel.Heading>
                                            <Panel.Body>
                                                <Grid>
                                                    <Row className='show-grid'>
                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup controlId='booth'>
                                                                <ControlLabel>Select booth</ControlLabel>
                                                                <FormControl  componentClass='select' placeholder='select' value={this.state.booth}
                                                                              onChange={ this.handleChange} disabled={this.state.disabled}>
                                                                    <option value={''}>Select</option>
                                                                    {booths}
                                                                </FormControl>
                                                            </FormGroup>
                                                        </Col>
                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup controlId='vehicle' >
                                                                <ControlLabel>Select vehicle</ControlLabel>
                                                                <FormControl  componentClass='select' placeholder='select' value={this.state.vehicle}
                                                                              onChange={ this.selectVehicle.bind(this)} disabled={this.state.disabled}>
                                                                    <option value={''}>Select</option>
                                                                    {vehicles}
                                                                </FormControl>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>

                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='password'>
                                                                <ControlLabel>Password</ControlLabel>
                                                                <FormControl
                                                                    type='text'
                                                                    value={this.state.password}
                                                                    disabled={this.state.disabled}
                                                                    placeholder='Input vehicle password'
                                                                    onChange={this.handleChange}/>
                                                            </FormGroup>
                                                        </Col>

                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='gas'>
                                                                <ControlLabel>Change the gas limits</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.gas}
                                                                    placeholder='Change gas'
                                                                    onChange={this.handleChange}
                                                                    disabled={this.state.disabled}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col md={3}>
                                                            <Button bsStyle="primary" disabled={this.state.disabled}
                                                                    onClick={this.exitRoad.bind(this)}>Exit and report</Button>
                                                        </Col>
                                                    </Row>

                                                    <Row>
                                                    </Row>

                                                    <Row>
                                                        <Col xs={10} md={10} lg={10}>
                                                            <FormGroup
                                                                controlId='vehicleHistoryText'>
                                                                <ControlLabel>Vehicle info</ControlLabel>
                                                                <FormControl
                                                                    componentClass="textarea"
                                                                    type='text'
                                                                    value={this.state.vehicleHistoryText}
                                                                    placeholder='Vehicle info'
                                                                    disabled={true}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>

                                                </Grid>
                                                <p/>
                                                <div>

                                                </div>
                                            </Panel.Body>
                                        </Panel>
                                    </Col>

                                    <Col xs={2} md={2} lg={2}>
                                    </Col>

                                </Row>
                            </Panel.Body>
                        </Panel>
                    </Col>
                </Row>

            </div>

        )
    }
}

export default TollBoothComponent