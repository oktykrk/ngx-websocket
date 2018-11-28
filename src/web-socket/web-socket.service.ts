import { CloseCode, WebSocketState } from './enums';
import { Event } from './event';
import { Injectable } from '@angular/core';

@Injectable()
export class WebSocketService {
	
	private _webSocket: WebSocket;
	private _url: string;
	private _protocols: any;
	private _reconnectionAttemptCounter = 0;
	
	private _destroyed = false;
	
	private _reconnectOnError = true;
	public get reconnectOnError(): boolean {
		return this._reconnectOnError;
	}
	public set reconnectOnError(v: boolean) {
		this._reconnectOnError = v;
	}
	
	private _reconnectionTryDelay = 1500;
	public get reconnectionTryDelay(): number {
		return this._reconnectionTryDelay;
	}
	public set reconnectionTryDelay(v: number) {
		if (v > 0 && v < 10000) {
			this._reconnectionTryDelay = v;
		}
	}
	
	private _reconnectionTryLimit = 4;
	public get reconnectionTryLimit(): number {
		return this._reconnectionTryLimit + 1;
	}
	public set reconnectionTryLimit(v: number) {
		this._reconnectionTryLimit = v - 1;
	}
	
	private _unlimitedConnectionTry = false;
	public get unlimitedConnectionTry(): boolean {
		return this._unlimitedConnectionTry;
	}
	public set unlimitedConnectionTry(v: boolean) {
		this._unlimitedConnectionTry = v;
	}
	
	public get webSocketState(): WebSocketState {
		return this._webSocket ? this._webSocket.readyState : WebSocketState.CLOSED;
	}
	
	private _onConnected = new Event<any>();
	private _onConnectionFailed = new Event<any>();
	private _onDisconnected = new Event<any>();
	private _onMessageReceived = new Event<any>();
	private _onError = new Event<any>();
	
	public get OnConnected() { return this._onConnected.expose(); }
	public get OnConnectionFailed() { return this._onConnectionFailed.expose(); }
	public get OnDisconnected() { return this._onDisconnected.expose(); }
	public get OnMessageReceived() { return this._onMessageReceived.expose(); }
	public get OnError() { return this._onError.expose(); }
	
	
	private initializeWebSocket() {
		this._webSocket = new WebSocket(this._url, this._protocols);
		
		const _this = this;
		this._webSocket.onopen = (e) => {
			_this._onConnected.handle(e);
			_this._reconnectionAttemptCounter = 0;
			return false;
		};
		this._webSocket.onmessage = (e) => {
			_this._onMessageReceived.handle(e);
			return false;
		};
		this._webSocket.onclose = (e) => {
			if (e.code === CloseCode.CONSCIOUS) {
				_this._onDisconnected.handle(e);
			} else {
				
				if (_this._webSocket && _this._reconnectOnError && !_this._unlimitedConnectionTry && _this._reconnectionAttemptCounter < _this._reconnectionTryLimit) {
					
					setTimeout(() => {
						_this.Connect(_this._url, _this._protocols);
					}, _this.reconnectionTryDelay);
					
					_this._reconnectionAttemptCounter++;
					
					if (_this._reconnectionAttemptCounter === _this._reconnectionTryLimit) {
						_this._onConnectionFailed.handle({
							numberOfAttempts: _this._reconnectionAttemptCounter,
							reconnectionTryLimit: _this._reconnectionTryLimit
						});
					}
				}
				
				if (_this._webSocket && _this._reconnectOnError && _this._unlimitedConnectionTry) {
					setTimeout(() => {
						_this.Connect(_this._url, _this._protocols);
					}, _this.reconnectionTryDelay);
				}
			}
			return false;
		};
		this._webSocket.onerror = (e) => {
			if (_this.webSocketState === WebSocketState.OPEN) {
				_this._onError.handle(e);
			}
			return false;
		};
	}
	
	public Connect(url: string, protocols?: any) {
		if (!this._destroyed && this.webSocketState !== WebSocketState.CONNECTING && this.webSocketState !== WebSocketState.OPEN) {
			this._url = url;
			this._protocols = protocols;
			
			this.initializeWebSocket();
		}
	}
	public Disconnect() {
		if (this.webSocketState === WebSocketState.CONNECTING || this.webSocketState === WebSocketState.OPEN) {
			this._webSocket.close(CloseCode.CONSCIOUS, 'Disconnect method called.');
		}
	}
	public Destroy() {
		this._destroyed = true;
		// flush disconnect.
		this.Disconnect();
		this.Disconnect();
		this.Disconnect();
		// free the websocket.
		this._webSocket = undefined;
	}
	public SendMessage(msg: string) {
		if (this.webSocketState === WebSocketState.OPEN) {
			this._webSocket.send(msg);
		}
	}
}
