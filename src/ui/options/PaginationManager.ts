export class PaginationManager {
    private currentPage: number = 1;
    private itemsPerPage: number = 50;
    private totalItems: number = 0;

    setTotalItems(total: number): void {
        this.totalItems = total;
    }

    getTotalItems(): number {
        return this.totalItems;
    }

    getCurrentPage(): number {
        return this.currentPage;
    }

    getItemsPerPage(): number {
        return this.itemsPerPage;
    }

    getTotalPages(): number {
        return Math.ceil(this.totalItems / this.itemsPerPage);
    }

    getStartIndex(): number {
        return (this.currentPage - 1) * this.itemsPerPage;
    }

    getEndIndex(): number {
        return Math.min(this.startIndex + this.itemsPerPage, this.totalItems);
    }

    goToPage(page: number): boolean {
        const totalPages = this.getTotalPages();
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            return true;
        }
        return false;
    }

    goToFirstPage(): boolean {
        return this.goToPage(1);
    }

    goToLastPage(): boolean {
        return this.goToPage(this.getTotalPages());
    }

    goToPrevPage(): boolean {
        return this.goToPage(this.currentPage - 1);
    }

    goToNextPage(): boolean {
        return this.goToPage(this.currentPage + 1);
    }

    resetToFirstPage(): void {
        this.currentPage = 1;
    }

    hasNextPage(): boolean {
        return this.currentPage < this.getTotalPages();
    }

    hasPrevPage(): boolean {
        return this.currentPage > 1;
    }

    get startIndex(): number {
        return this.getStartIndex();
    }

    get endIndex(): number {
        return this.getEndIndex();
    }
}
