class LCSDistanceResolver {
    constuctor() {
        this._matrix = [];
        this._previousMatrix = [];
        this._distance = 0;
    }

    resolve(sequence1, sequence2, isEqualFn = (a, b) => a === b) {
        this._matrix = [];
        this._previousMatrix = [];
        for (let i = 0; i <= sequence1.length; ++i) {
            this._matrix[i] = [i];
            this._previousMatrix[i] = [[0, 0]]
        }
        for (let i = 0; i <= sequence2.length; ++i) {
            this._matrix[0][i] = i;
            this._previousMatrix[0][i] = [0, 0];
        }
        for (let rn = 1; rn <= sequence1.length; ++rn) {
            for (let cn = 1; cn <= sequence2.length; ++cn) {
                if (isEqualFn(sequence1[rn - 1], sequence2[cn - 1])) {
                    this._matrix[rn][cn] = this._matrix[rn - 1][cn - 1];
                    this._previousMatrix[rn][cn] = [rn - 1, cn - 1];
                } else {
                    if (this._matrix[rn - 1][cn] > this._matrix[rn][cn - 1]) {
                        this._matrix[rn][cn] = this._matrix[rn][cn - 1] + 1;
                        this._previousMatrix[rn][cn] = [rn, cn - 1];
                    } else {
                        this._matrix[rn][cn] = this._matrix[rn - 1][cn] + 1;
                        this._previousMatrix[rn][cn] = [rn - 1, cn];
                    }
                }
            }
        }
        this._distance = this._matrix[sequence1.length][sequence2.length];
    }

    get matrix() {
        return this._matrix;
    }

    get previousMatrix() {
        return this._previousMatrix;
    }

    get distance() {
        return this._distance;
    }
}

module.exports = LCSDistanceResolver;