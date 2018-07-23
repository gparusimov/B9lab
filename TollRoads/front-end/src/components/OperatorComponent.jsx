import React, { Component } from 'react'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
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


class OperatorComponent extends Component {
    constructor (props, context) {
        super(props, context);

        this.state = {
            gas: CONFIG.DEFAULT_GAS_LIMIT,
            operatorAddress: '',
            operatorOwner: '',
            newTollBooth: '',
            entryBooth: '',
            exitBooth: '',
            roadPrice: '',
            vehicleType: '',
            multiplier: 1,
            multipliers: [],
            vehicleTypes: [],
            isPaused: false,
            disabled: true
        };

        this.handleChange = this.handleChange.bind(this);
    }

    async componentWillMount () {
        const vehicleTypes = await OperatorService.getVehicleTypes(this.props.parentState.vehicles);
        this.setState({
            ...this.state,
            vehicleTypes,
            disabled: true,
            isPaused: false

        })
    }

    async handleChange (e) {
        await this.setState({ ...this.state, [e.target.id]: e.target.value });
    }

    setDisabled () {
        this.setState({
            ...this.state,
            disabled: true
        })
    }

    async selectOperator (e) {
        const operatorAddress = e.target.value;
        await this.getAllOperatorInfo(operatorAddress);
        if (operatorAddress && this.state.isPaused){
            await this.runOperator();
        }
    }


    async getAllOperatorInfo (operatorAddress) {
        if (operatorAddress) {
            this.setDisabled();
            const operatorOwner = await OperatorService.getOperatorOwner(operatorAddress);
            const isPaused = await OperatorService.isOperatorPaused(operatorAddress);
            const multipliers = await OperatorService.getMultipliers(operatorAddress,this.props.parentState.vehicles);

            this.setState({
                ...this.state,
                operatorOwner,
                operatorAddress,
                isPaused,
                disabled: false,
                newTollBooth:'',
                entryBooth: '',
                exitBooth: '',
                roadPrice: '',
                multipliers
            })
        } else this.setState({ ...this.state, operatorAddress })
    }

    async addNewTollBooth() {
        this.setDisabled();
        const  txTollBooth = await OperatorService.addTollBooth(this.state.newTollBooth,
            this.state.operatorAddress,
            this.state.operatorOwner,
            this.state.gas);
        if (txTollBooth && txTollBooth.logs.length > 0 ) {
            const booth = txTollBooth.logs[0].args.tollBooth;
            const newTollBoothObj = {
                tollBooth: booth
            };
            let newState;
            if(this.props.parentState.tollBooths[this.state.operatorAddress]) {
                newState = await {
                    ...this.props.parentState.tollBooths,
                    [this.state.operatorAddress]: [...this.props.parentState.tollBooths[this.state.operatorAddress], newTollBoothObj]};
            } else {
                newState = await {
                    ...this.props.parentState.tollBooths,
                    [this.state.operatorAddress]: [newTollBoothObj]};
            }
            await this.props.changeParentState('tollBooths', newState);
        }
        await this.setState({...this.state,
            entryBooth : '',
            exitBooth: '',
            disabled: false
        });
    }

    async runOperator() {
        await OperatorService.setPaused(this.state.operatorAddress, false, this.state.operatorOwner, this.state.gas );
        const isPaused = await OperatorService.isOperatorPaused(this.state.operatorAddress);
        this.setState({ ...this.state, isPaused })
    }

    async stopOperator () {
        await OperatorService.setPaused(this.state.operatorAddress, true, this.state.operatorOwner, this.state.gas );
        const isPaused = await OperatorService.isOperatorPaused(this.state.operatorAddress);
        this.setState({ ...this.state, isPaused })
    }

    async checkUpdatePrice( prices, route ){
        if (prices && prices.length) {
            for(let i = 0; i < prices.length; i++){
                if (prices[i].entryBooth === route.entryBooth && prices[i].exitBooth  === route.exitBooth){
                    prices[i].roadPrice = route.roadPrice;
                    let newState = await {
                        ...this.props.parentState.roadPrices,
                        [this.state.operatorAddress]: prices};
                    return await newState;
                }
            }
            return await false;
        }
        return await false;

    }

    async setNewRoutePrice() {
        this.setDisabled();
        const txRoutePrice = await OperatorService.setRoutePrice(this.state.operatorAddress, this.state.roadPrice,
            this.state.entryBooth, this.state.exitBooth, this.state.operatorOwner, this.state.gas);

        if (txRoutePrice && txRoutePrice.logs.length > 0 ) {
            const price = txRoutePrice.logs[0].args.priceWeis;
            const entryBooth = txRoutePrice.logs[0].args.entryBooth;
            const exitBooth = txRoutePrice.logs[0].args.exitBooth;
            const newRoutePriceObj = {
                entryBooth,
                exitBooth,
                roadPrice: price
            };
            let newState;
            let prices=this.props.parentState.roadPrices[this.state.operatorAddress];

            if (newState = await this.checkUpdatePrice(prices, newRoutePriceObj)) {
                console.log('Change price between '+ newRoutePriceObj.entryBooth +' and '+newRoutePriceObj.exitBooth+' to '+ newRoutePriceObj.roadPrice);
            } else {
                newState = await {
                    ...this.props.parentState.roadPrices,
                    [this.state.operatorAddress]: [...prices||[], newRoutePriceObj]};
            }
            await this.props.changeParentState('roadPrices', newState);

            if (txRoutePrice.logs.length === 2 && txRoutePrice.logs[1].event === 'LogRoadExited'){
                const exitSecretHashed = txRoutePrice.logs[1].args.exitSecretHashed;
                const finalFee = txRoutePrice.logs[1].args.finalFee;
                const refundWeis = txRoutePrice.logs[1].args.refundWeis;
                const exitBooth = txRoutePrice.logs[1].args.exitBooth;

                const newReportExitObj = {
                    exitBooth,
                    finalFee,
                    refundWeis,
                    exitSecretHashed,
                    action: 'Exited',
                    event:'LogRoadExited'
                };

                const vehicleEntry = await OperatorService.getVehicle(this.state.operatorAddress, exitSecretHashed, this.state.operatorOwner, this.state.gas);
                const vehicleHistory = this.props.parentState.vehicleHistory[vehicleEntry[0]];
                newState = await this.updateVehicleHistory(vehicleHistory, newReportExitObj);

                await this.props.changeParentState('vehicleHistory', newState);
            }

            this.setState({...this.state, disabled: false});


        }
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


    async setMultiplier () {
        this.setDisabled();
        await OperatorService.setMultiplier(this.state.operatorAddress, this.state.vehicleType,
            this.state.multiplier, this.state.operatorOwner, this.state.gas);
        const multipliers = await OperatorService.getMultipliers(this.state.operatorAddress,this.props.parentState.vehicles);
        this.setState({
            ...this.state,
            multipliers,
            disabled: false
        })
    }

    isEntryBoothSelected(booth) {
        return booth.tollBooth === this.state.entryBooth && !this.state.exitBooth;
    }

    isExitBoothSelected(booth) {
        return booth.tollBooth === this.state.exitBooth  && !this.state.entryBooth;
    }

    async selectBooth (e) {
        const boothFiled = e.target.id;
        const boothValue = e.target.value;
        let otherBoothFiled;

        if(boothFiled === 'entryBooth') {
            otherBoothFiled ='exitBooth' }
        else {
            otherBoothFiled = 'entryBooth'
        }

        if (this.state[otherBoothFiled] === boothValue) {
            await this.setState({ ...this.state, [otherBoothFiled]: ''});
        }

        await this.setState({ ...this.state, [boothFiled]: boothValue });
    }

    render () {
        const operators = this.props.parentState.operators
            .map(op => (<option key={op.operator} value={op.operator}>{op.operator}</option>));

        const entryBooths = (this.props.parentState.tollBooths[this.state.operatorAddress] || [])
            .map(bth => this.isExitBoothSelected(bth) ?  '' : (<option key={bth.tollBooth} value={bth.tollBooth}>{bth.tollBooth}</option>));

        const exitBooths = (this.props.parentState.tollBooths[this.state.operatorAddress] || [])
            .map(bth => this.isEntryBoothSelected(bth) ?  '' : (<option key={bth.tollBooth} value={bth.tollBooth}>{bth.tollBooth}</option>))

        const vehicleTypes = this.state.vehicleTypes
            .map(type => (<option key={type} value={type}>{type}</option>));
        return (
            <div>
                <Row className='show-grid'>
                    <Col  md={12}>
                        <Panel bsStyle="primary">
                            <Panel.Heading>
                                <Panel.Title componentClass="h2"><b><center>Operator actions</center> </b></Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>
                                <Row>
                                    <Col md={4} lg={4}>
                                    </Col>
                                    <Col md={4} lg={4}>
                                        <FormGroup controlId='operator' >
                                            <ControlLabel>Select operator</ControlLabel>
                                            <FormControl  componentClass='select' placeholder='select' value={this.state.operatorAddress} onChange={ this.selectOperator.bind(this) }>
                                                <option value={''}>Select</option>
                                                {operators}
                                            </FormControl>
                                        </FormGroup>
                                    </Col>
                                    <Col md={4} lg={4}>
                                    </Col>
                                </Row>

                                <Row className='show-grid'>
                                    <Col md={3} lg={3}>
                                        <Label bsStyle='primary' >{'Owner: ' + this.state.operatorOwner}</Label>
                                        <Label bsStyle='warning'>{this.state.disabled ? 'Please wait' : ''}</Label>
                                    </Col>
                                    <Col md={6} lg={6}>
                                        <Label bsStyle='primary' >{'Owner: ' + this.state.operatorOwner}</Label>
                                        <Label bsStyle='warning'>{this.state.disabled ? 'Please wait' : ''}</Label>
                                    </Col>
                                    <Col md={3} lg={3}>
                                        <Label bsStyle='primary' >{'Owner: ' + this.state.operatorOwner}</Label>
                                        <Label bsStyle='warning'>{this.state.disabled ? 'Please wait' : ''}</Label>
                                    </Col>
                                </Row>

                                <Row className='show-grid'>

                                    {/* Add booth*/}
                                    <Col xs={12} md={3} lg={3}>
                                        <Panel bsStyle="primary">
                                            <Panel.Heading>
                                                <Panel.Title componentClass="h2"><b>Add toll booth</b></Panel.Title>
                                            </Panel.Heading>
                                            <Panel.Body>
                                                <Grid>
                                                    <Row className='show-grid'>
                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup
                                                                controlId='newTollBooth'>
                                                                <ControlLabel>New tool booth address</ControlLabel>
                                                                <FormControl
                                                                    type='text'
                                                                    value={this.state.newTollBooth}
                                                                    placeholder='Enter address'
                                                                    onChange={this.handleChange}
                                                                    disabled={this.state.disabled}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='gas'>
                                                                <ControlLabel>Change the gas limits</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.gas}
                                                                    placeholder='Enter gas'
                                                                    onChange={this.handleChange}
                                                                    disabled={this.state.disabled}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col md={3}>
                                                            <Button bsStyle="primary" disabled={this.state.disabled}
                                                                    onClick={this.addNewTollBooth.bind(this)}>Add new booth</Button>
                                                        </Col>
                                                    </Row>
                                                </Grid>
                                                <p/>
                                                <div>

                                                    <BootstrapTable
                                                        data={ this.props.parentState.tollBooths[this.state.operatorAddress] || [{'tollBooth': ''}] }
                                                        bsFiltersSize="sm"
                                                        search
                                                        headerStyle ={ { background: '#337ab7' }}
                                                        bodyStyle={{ maxHeight: '64vh', overflow: 'overlay' }}>

                                                        <TableHeaderColumn
                                                            ref="tollBooths"
                                                            isKey={true}
                                                            width='100%'
                                                            dataField="tollBooth"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by address' }}
                                                            dataSort>
                                                            Toll booth address
                                                        </TableHeaderColumn>
                                                    </BootstrapTable>
                                                </div>
                                            </Panel.Body>
                                        </Panel>
                                    </Col>

                                    {/* Set price*/}
                                    <Col xs={12} md={6} lg={6}>
                                        <Panel bsStyle="primary">
                                            <Panel.Heading>
                                                <Panel.Title componentClass="h2"><b>Set base route price</b></Panel.Title>
                                            </Panel.Heading>
                                            <Panel.Body>
                                                <Grid>
                                                    <Row className='show-grid'>
                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup controlId='entryBooth'>
                                                                <ControlLabel>Select entry booth</ControlLabel>
                                                                <FormControl  componentClass='select' placeholder='select' value={this.state.entryBooth}
                                                                              onChange={  this.selectBooth.bind(this)} disabled={this.state.disabled}>
                                                                    <option value={''}>Select</option>
                                                                    {entryBooths}
                                                                </FormControl>
                                                            </FormGroup>
                                                        </Col>

                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup controlId='exitBooth'>
                                                                <ControlLabel>Select exit booth (another than entry booth)</ControlLabel>
                                                                <FormControl  componentClass='select' placeholder='select' value={this.state.exitBooth}
                                                                              onChange={ this.selectBooth.bind(this)} disabled={this.state.disabled}>
                                                                    <option value={''}>Select</option>
                                                                    {exitBooths}
                                                                </FormControl>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='roadPrice'>
                                                                <ControlLabel>Road price</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.roadPrice}
                                                                    placeholder='Input price'
                                                                    onChange={this.handleChange}
                                                                    disabled={this.state.disabled}/>
                                                            </FormGroup>
                                                        </Col>

                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='gas'>
                                                                <ControlLabel>Change the gas limits</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.gas}
                                                                    placeholder='Enter gas'
                                                                    onChange={this.handleChange}
                                                                    disabled={this.state.disabled}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col md={3}>
                                                            <Button bsStyle="primary" disabled={this.state.disabled}
                                                                    onClick={this.setNewRoutePrice.bind(this)}>Set road price</Button>
                                                        </Col>
                                                    </Row>
                                                </Grid>
                                                <p/>
                                                <div>

                                                    <BootstrapTable
                                                        data= {this.props.parentState.roadPrices[this.state.operatorAddress] || []}
                                                        bsFiltersSize="sm"
                                                        search
                                                        headerStyle ={ { background: '#337ab7' }}
                                                        bodyStyle={{ maxHeight: '64vh', overflow: 'overlay' }}>
                                                        <TableHeaderColumn
                                                            ref="entryBooth"
                                                            width='40%'
                                                            dataField="entryBooth"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by address' }}
                                                            dataSort>
                                                            Entry booth address
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="exitBooth"
                                                            width='40%'
                                                            dataField="exitBooth"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by address' }}
                                                            dataSort>
                                                            Exit booth address
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="roadPrice"
                                                            isKey={true}
                                                            width='20%'
                                                            dataField="roadPrice"
                                                            dataSort>
                                                            Price
                                                        </TableHeaderColumn>
                                                    </BootstrapTable>
                                                </div>
                                            </Panel.Body>
                                        </Panel>
                                    </Col>

                                    {/* Set multiplier*/}
                                    <Col xs={12} md={3} lg={3}>
                                        <Panel bsStyle="primary">
                                            <Panel.Heading>
                                                <Panel.Title componentClass="h2"><b>Set muliplier</b></Panel.Title>
                                            </Panel.Heading>
                                            <Panel.Body>
                                                <Grid>
                                                    <Row className='show-grid'>
                                                        <Col xs={7} md={3} lg={3}>
                                                            <FormGroup controlId='vehicleType'>
                                                                <ControlLabel>Select vehicle type</ControlLabel>
                                                                <FormControl  componentClass='select' placeholder='select' value={this.state.vehicleType}
                                                                              onChange={ this.handleChange} disabled={this.state.disabled}>
                                                                    <option value={''}>Select</option>
                                                                    {vehicleTypes}
                                                                </FormControl>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row className='show-grid'>
                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='multiplier'>
                                                                <ControlLabel>Set multiplier</ControlLabel>
                                                                <FormControl
                                                                    type='text'
                                                                    value={this.state.multiplier}
                                                                    placeholder='Enter multiplier'
                                                                    onChange={this.handleChange}
                                                                    disabled={this.state.disabled}/>
                                                            </FormGroup>
                                                        </Col>

                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='gas'>
                                                                <ControlLabel>Change the gas limits</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.gas}
                                                                    placeholder='Enter gas'
                                                                    onChange={this.handleChange}
                                                                    disabled={this.state.disabled}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col md={3}>
                                                            <Button bsStyle="primary" disabled={this.state.disabled}
                                                                    onClick={this.setMultiplier.bind(this)}>Set multiplier</Button>
                                                        </Col>
                                                    </Row>
                                                </Grid>
                                                <p/>
                                                <div>
                                                    <BootstrapTable
                                                        data={ this.state.multipliers}
                                                        bsFiltersSize="sm"
                                                        search
                                                        headerStyle ={ { background: '#337ab7' }}
                                                        bodyStyle={{ maxHeight: '64vh', overflow: 'overlay' }}>
                                                        <TableHeaderColumn
                                                            ref="vehicleType"
                                                            isKey={true}
                                                            width='100%'
                                                            dataField="vehicleType"
                                                            dataSort>
                                                            Vehicle type
                                                        </TableHeaderColumn>
                                                        <TableHeaderColumn
                                                            ref="multiplier"
                                                            width='100%'
                                                            dataField="multiplier"
                                                            dataSort>
                                                            Multiplier
                                                        </TableHeaderColumn>
                                                    </BootstrapTable>
                                                </div>
                                            </Panel.Body>
                                        </Panel>
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

export default OperatorComponent