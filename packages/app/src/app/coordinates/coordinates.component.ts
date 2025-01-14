import { Component, inject } from '@angular/core';
import { ZsMapStateService } from '../state/state.service';
import { projectionByIndex } from '../helper/projections';
import { ChangeType, ProjectionSelectionComponent } from '../projection-selection/projection-selection.component';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-coordinates',
  templateUrl: './coordinates.component.html',
  styleUrl: './coordinates.component.scss',
  imports: [ProjectionSelectionComponent],
})
export class CoordinatesComponent {
  private _state = inject(ZsMapStateService);

  showOptions = false;
  projectionFormatIndexes: number[];
  coordinates: string[] = [];
  constructor() {
    //TODO: load this from session/state?
    this.projectionFormatIndexes = [0, 1];
    this._state.getCoordinates().subscribe(this.updateCoordinates.bind(this));
  }

  updateCoordinates(coordinates) {
    this.coordinates = this.projectionFormatIndexes.map((i) => {
      const proj = projectionByIndex(i);
      return proj.translate(proj.transformTo(coordinates));
    });
  }

  updateProjection(value: ChangeType) {
    if (!value.projectionFormatIndexes || value.projectionFormatIndexes?.length === 0) {
      this.projectionFormatIndexes = [0];
    } else {
      this.projectionFormatIndexes = value.projectionFormatIndexes;
    }
    this._state.getCoordinates().pipe(first()).subscribe(this.updateCoordinates.bind(this));
    //TODO: save this to session/state?
  }
}
