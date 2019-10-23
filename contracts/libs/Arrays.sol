pragma solidity ^0.5.8;

library Arrays {
    /// Find median of an unsorted uint array. Note that items in the input array might be swapped.
    function findMedian(uint[] memory unsorted) internal pure returns (uint) {
        require(unsorted.length > 0, "empty array has no median");

        uint medianIndex = unsorted.length / 2;
        return Quick.select(unsorted, medianIndex);
    }
}

/// Quick select/sort.
library Quick {
    /// Select kth smallest item, where k starts from 0.
    function select(uint[] memory arr, uint k) internal pure returns (uint) {
        require((0 <= k) && (k < arr.length), "k out of bound");

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
    function partition(uint[] memory arr, uint low, uint high) internal pure returns (uint) {
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

            (arr[i], arr[j]) = (arr[j], arr[i]);
        }

        // put partitioning item v at arr[j]
        (arr[low], arr[j]) = (arr[j], arr[low]);

        return j;
    }
}
