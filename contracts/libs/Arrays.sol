pragma solidity ^0.5.8;

library Arrays {
    /// Find median of an unsorted uint array. Note that items in the input array might be swapped.
    function findMedian(uint[] storage unsorted) internal returns (uint) {
        uint medianIndex = unsorted.length / 2;
        return Quick.select(unsorted, medianIndex);
    }
}

/// Quick select/sort.
library Quick {
    /// Select kth smallest item.
    function select(uint[] storage arr, uint k) internal returns (uint) {
        require((0 <= k) && (k < arr.length), "index out of bound");

        uint low = 0;
        uint high = arr.length - 1;
        while (high > low) {
            uint i = partition(arr, low, high);
            if (i > k) high = i - 1;
            else if (i < k) low = i + 1;
            else return arr[i];
        }
        return arr[low];
    }

    /// Partition the subarray a[low..high] so that a[low..j-1] <= a[j] <= a[j+1..high] and return j.
    function partition(uint[] storage arr, uint low, uint high) internal returns (uint) {
        uint i = low;
        uint j = high + 1;
        uint v = arr[low];

        while (true) {
            // find item on low to swap
            while (arr[++i] < v) {
                if (i == high) break;
            }
            // find item on high to swap
            while (v < arr[--j]) {
                if (j == low) break;
            }

            // check if pointer cross
            if (i >= j) break;

            swap(arr, i, j);
        }

        // put partitioning item v at arr[j]
        swap(arr, low, j);

        return j;
    }

    function swap(uint[] storage arr, uint i, uint j) private {
        uint temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
