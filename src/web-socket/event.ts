export interface IEvent<T> {
	subscribe(handler: (data?: T) => void): void;
	unsubscribe(handler: (data?: T) => void): void;
}

export class Event<T> implements IEvent<T> {
	private handlers: ((data?: T) => void)[] = [];

	public subscribe(handler: (data?: T) => void): void {
		this.handlers.push(handler);
	}

	public unsubscribe(handler: (data?: T) => void): void {
		this.handlers = this.handlers.filter(h => h !== handler);
	}

	public handle(data?: T) {
		this.handlers.slice(0).forEach(h => h(data));
	}

	public expose(): IEvent<T> {
		return this;
	}
}
