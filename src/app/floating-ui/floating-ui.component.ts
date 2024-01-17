import { Component } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { SidebarContext } from '../state/interfaces';
import { ZsMapStateService } from '../state/state.service';
import { I18NService } from '../state/i18n.service';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { SyncService } from '../sync/sync.service';
import { SessionService } from '../session/session.service';
import { ZsMapBaseLayer } from '../map-renderer/layers/base-layer';

@Component({
  selector: 'app-floating-ui',
  templateUrl: './floating-ui.component.html',
  styleUrl: './floating-ui.component.scss',
})
export class FloatingUIComponent {
  sidebarContext = SidebarContext;
  sidebarContext$: Observable<SidebarContext | null>;
  public isDevicePositionFlagVisible = false;
  private _ngUnsubscribe = new Subject<void>();
  public connectionCount = new BehaviorSubject<number>(0);
  public isOnline = new BehaviorSubject<boolean>(true);
  public isReadOnly = new BehaviorSubject<boolean>(false);
  private _deviceTrackingLayer!: VectorLayer<VectorSource>;
  activeLayer$: Observable<ZsMapBaseLayer | undefined>;
  public canUndo = new BehaviorSubject<boolean>(false);
  public canRedo = new BehaviorSubject<boolean>(false);

  constructor(
    public i18n: I18NService,
    public _state: ZsMapStateService,
    private _sync: SyncService,
    private _session: SessionService,
  ) {
    this.sidebarContext$ = _state.observeSidebarContext();
    this._state.observeIsReadOnly().pipe(takeUntil(this._ngUnsubscribe)).subscribe(this.isReadOnly);

    this._state
      .observeHistory()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe(({ canUndo, canRedo }) => {
        this.canUndo.next(canUndo);
        this.canRedo.next(canRedo);
      });

    this._session
      .observeIsOnline()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((isOnline) => {
        this.isOnline.next(isOnline);
      });

    this._sync
      .observeConnections()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((connections) => {
        this.connectionCount.next(connections.length);
      });

    this.activeLayer$ = _state.observeActiveLayer();
  }

  zoomIn() {
    this._state.updateMapZoom(1);
  }

  zoomOut() {
    this._state.updateMapZoom(-1);
  }
  setSidebarContext(context: SidebarContext | null) {
    this._state.toggleSidebarContext(context);
  }

  undo() {
    this._state.undoMapStateChange();
  }

  redo() {
    this._state.redoMapStateChange();
  }
}