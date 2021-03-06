import { IQService } from 'angular';
import { IColumnDef, IGridColumn, IGridInstance, IGridOptions, IGridRow } from 'ui-grid';
import { Measurer } from './Measurer';
import { UiGridMetrics } from './UiGridMetrics';

interface IExtendedColumnDef extends IColumnDef {
    enableColumnAutoFit: boolean;
}

interface IExtendedGridColumn extends IGridColumn {
    colDef: IExtendedColumnDef;
}

interface IExtendedGridInstance extends IGridInstance {
    options: IExtendedGridOptions;
}

interface IExtendedGridOptions extends IGridOptions {
    enableColumnAutoFit: boolean;
}

interface IAnyFilterPredicateFunc {
    (value: any, firstFlag?: any, secondFlag?: any): string;
}

export class UiGridAutoFitColumnsService {
    static $inject = ['$q', '$filter', '$parse'];
    private gridMetrics: UiGridMetrics;

    constructor (private $q: IQService) {
        this.gridMetrics = new UiGridMetrics();
    }

    initializeGrid(grid: IExtendedGridInstance) {
        grid.registerColumnBuilder(this.colAutoFitColumnBuilder.bind(this));
        grid.registerColumnsProcessor(this.columnsProcessor.bind(this), 60);

        UiGridAutoFitColumnsService.defaultGridOptions(grid.options);
    }

    static defaultGridOptions(gridOptions: IExtendedGridOptions) {
        // true by default
        gridOptions.enableColumnAutoFit = gridOptions.enableColumnAutoFit !== false;
    }

    colAutoFitColumnBuilder(colDef: IExtendedColumnDef, col: IExtendedGridColumn, gridOptions: IExtendedGridOptions) {
        const promises = [];

        if (colDef.enableColumnAutoFit === undefined) {
            //TODO: make it as col.isResizable()
            if (UiGridAutoFitColumnsService.isResizable(colDef)) {
                colDef.enableColumnAutoFit = gridOptions.enableColumnAutoFit;
            } else {
                colDef.enableColumnAutoFit = false;
            }
        }

        return this.$q.all(promises);
    }

    static isResizable(colDef: IExtendedColumnDef): boolean {
        return !colDef.hasOwnProperty('width');
    }

    columnsProcessor(renderedColumnsToProcess?: Array<IExtendedGridColumn>, rows?: Array<IGridRow>) {
        if (!rows.length) {
            return renderedColumnsToProcess;
        }
        // TODO: respect existing colDef options
        // if (col.colDef.enableColumnAutoFitting === false) return;

        let optimalWidths: {
            [name: string]: number
        } = {};


        renderedColumnsToProcess.forEach(column => {

            if (column.colDef.enableColumnAutoFit) {
                const columnKey = column.field || column.name;
                optimalWidths[columnKey] = Measurer.measureRoundedTextWidth(column.displayName, this.gridMetrics.getHeaderFont()) + this.gridMetrics.getHeaderButtonsWidth();

                rows.forEach((row) => {
                    const cellText = row.grid.getCellDisplayValue(row, column);
                    const currentCellWidth = Measurer.measureRoundedTextWidth(cellText, this.gridMetrics.getCellFont());
                    const optimalCellWidth = currentCellWidth > 300 ? 300 : currentCellWidth;

                    if (optimalCellWidth > optimalWidths[columnKey]) {
                        optimalWidths[columnKey] = optimalCellWidth;
                    }
                });

                column.colDef.width = optimalWidths[columnKey] + this.gridMetrics.getPadding() + this.gridMetrics.getBorder();
                column.updateColumnDef(column.colDef, false);
            }
        });
        return renderedColumnsToProcess;
    }

}
