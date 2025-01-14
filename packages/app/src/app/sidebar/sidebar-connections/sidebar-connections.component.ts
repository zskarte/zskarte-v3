import { Component, OnDestroy, inject } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Observable } from 'rxjs/internal/Observable';
import { I18NService } from 'src/app/state/i18n.service';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { SyncService } from '../../sync/sync.service';
import { SessionService } from '../../session/session.service';
import { ZsMapStateService } from '../../state/state.service';
import { db } from 'src/app/db/db';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/confirmation-dialog/confirmation-dialog.component';
import { BlobService } from 'src/app/db/blob.service';
import { LOCAL_MAP_STYLE_PATH, LOCAL_MAP_STYLE_SOURCE } from 'src/app/session/default-map-values';
import { MapLayerService } from 'src/app/map-layer/map-layer.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AsyncPipe } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ZsMapStateSource, GeoJSONMapLayer, zsMapStateSourceToDownloadUrl } from '@zskarte/types';

@Component({
  selector: 'app-sidebar-connections',
  templateUrl: './sidebar-connections.component.html',
  styleUrls: ['./sidebar-connections.component.scss'],
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule, MatIconModule, MatListModule, AsyncPipe, MatCheckboxModule],
})
export class SidebarConnectionsComponent implements OnDestroy {
  i18n = inject(I18NService);
  private syncService = inject(SyncService);
  session = inject(SessionService);
  state = inject(ZsMapStateService);
  private _dialog = inject(MatDialog);
  private _blobService = inject(BlobService);
  private _mapLayerService = inject(MapLayerService);

  connections$: Observable<{ label?: string; currentLocation?: { long: number; lat: number } }[]> | undefined;
  label$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  showCurrentLocation$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  labelEdit = false;
  public isOnline = new BehaviorSubject<boolean>(true);
  private _ngUnsubscribe = new Subject<void>();

  isWorkLocal: boolean;
  useLocalBaseMap = false;
  downloadLocalBaseMap = false;
  hideUnavailableLayers = false;
  downloadAvailableLayers = false;
  haveSearchCapability = false;

  constructor() {
    const session = this.session;

    this.connections$ = this.syncService.observeConnections().pipe(takeUntil(this._ngUnsubscribe));
    this.label$?.next(this.session.getLabel() ?? '');
    this.state
      .observeShowCurrentLocation$()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((showCurrentLocation) => {
        this.showCurrentLocation$.next(showCurrentLocation);
      });
    this.session
      .observeIsOnline()
      .pipe(takeUntil(this._ngUnsubscribe))
      .subscribe((isOnline) => {
        this.isOnline.next(isOnline);
      });
    this.isWorkLocal = session.isWorkLocal();
    if (this.isWorkLocal) {
      this.updateOfflineInfos();
    }
  }

  ngOnDestroy(): void {
    this._ngUnsubscribe.next();
    this._ngUnsubscribe.complete();
  }

  public toggleEditLabel(): void {
    this.labelEdit = !this.labelEdit;
    if (this.labelEdit) return;
    this.session.setLabel(this.label$.value);
  }

  public centerMap(location: { long: number; lat: number }): void {
    this.state.updateCurrentMapCenter$([location.long, location.lat]);
  }

  updateOfflineInfos() {
    firstValueFrom(this.state.observeDisplayState()).then(async (displayState) => {
      this.useLocalBaseMap = displayState.source === ZsMapStateSource.LOCAL || displayState.source === ZsMapStateSource.NONE;
      this.downloadLocalBaseMap = (await db.localMapInfo.get(ZsMapStateSource.LOCAL))?.offlineAvailable ?? false;
      this.hideUnavailableLayers = displayState.layers.filter((l) => l.type !== 'geojson' && l.type !== 'csv' && !l.hidden).length === 0;
      this.downloadAvailableLayers =
        displayState.layers.filter((l) => (l.type === 'geojson' || l.type === 'csv') && !l.offlineAvailable).length === 0;
      this.haveSearchCapability =
        displayState.layers.filter((l) => (l.type === 'geojson' || l.type === 'csv') && (l as GeoJSONMapLayer).searchable).length > 0;
    });
  }

  changeToLocalMap() {
    this.state.setMapSource(ZsMapStateSource.LOCAL);
    this.useLocalBaseMap = true;
  }

  async downloadLocalMap() {
    if (!this.downloadLocalBaseMap) {
      const localMapInfo = (await db.localMapInfo.get(ZsMapStateSource.LOCAL)) || {
        map: ZsMapStateSource.LOCAL,
        styleSourceName: LOCAL_MAP_STYLE_SOURCE,
      };
      localMapInfo.offlineAvailable = true;
      if (!BlobService.isDownloaded(localMapInfo.mapBlobId)) {
        if (zsMapStateSourceToDownloadUrl[ZsMapStateSource.LOCAL]) {
          const localBlobMeta = await this._blobService.downloadBlob(
            zsMapStateSourceToDownloadUrl[ZsMapStateSource.LOCAL],
            localMapInfo.mapBlobId,
          );
          localMapInfo.mapBlobId = localBlobMeta.id;
          if (localBlobMeta.blobState !== 'downloaded') {
            localMapInfo.offlineAvailable = false;
          }
        }
      }
      if (!BlobService.isDownloaded(localMapInfo.styleBlobId)) {
        const localBlobMeta = await this._blobService.downloadBlob(LOCAL_MAP_STYLE_PATH, localMapInfo.styleBlobId);
        localMapInfo.styleBlobId = localBlobMeta.id;
        if (localBlobMeta.blobState !== 'downloaded') {
          localMapInfo.offlineAvailable = false;
        }
      }
      await db.localMapInfo.put(localMapInfo);
      this.downloadLocalBaseMap = localMapInfo.offlineAvailable;
    }
  }

  hideUnavailable() {
    this.state.updateDisplayState((draft) => {
      draft.layers.forEach((l) => {
        if (l.type !== 'geojson' && l.type !== 'csv') {
          l.hidden = true;
        }
      });
    });
    this.hideUnavailableLayers = true;
  }

  downloadAvailable() {
    this.state.updateDisplayState(async (draft) => {
      for (const layer of draft.layers) {
        if (layer.type === 'geojson' || layer.type === 'csv') {
          if (!layer.offlineAvailable) {
            await this._mapLayerService.saveLocalMapLayer(layer);
          }
        }
      }
    });
  }

  showSearchInfo(event) {
    event.preventDefault();
    this._dialog.open(ConfirmationDialogComponent, {
      data: this.i18n.get('howtoFindSearchCapability'),
    });
  }
}